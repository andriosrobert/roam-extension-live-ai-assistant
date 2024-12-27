import {
  Annotation,
  MessagesAnnotation,
  StateGraph,
  START,
} from "@langchain/langgraph/web";
import {
  SystemMessage,
  HumanMessage,
  AIMessage,
} from "@langchain/core/messages";
import { ChatOpenAI } from "@langchain/openai";
import { tool } from "@langchain/core/tools";
import { ToolNode, toolsCondition } from "@langchain/langgraph/prebuilt";
import { arrayOutputType, z } from "zod";
import { OPENAI_API_KEY, groqLibrary, openaiLibrary } from "../..";
import { StructuredOutputType } from "@langchain/core/language_models/base";
import {
  createChildBlock,
  deleteBlock,
  extractNormalizedUidFromRef,
  getBlockContentByUid,
  moveBlock,
  reorderBlocks,
  updateBlock,
  updateTokenCounter,
} from "../../utils/utils";
import {
  insertStructuredAIResponse,
  sanitizeJSONstring,
} from "../../utils/format";
import { getTemplateForPostProcessing } from "../aiCommands";
import { CallbackManager } from "@langchain/core/callbacks/manager";

const TransformerState = Annotation.Root({
  ...MessagesAnnotation.spec,
  rootUid: Annotation<String>,
  remainingOperations: Annotation<string>,
  notCompletedOperations: Annotation<string>,
  lastTurn: Annotation<boolean>,
});

// Tools

//   const tools = [];

const transformerSchema = z.object({
  message: z
    .string()
    .describe(
      "Answer to a question about the content in the outline, or notes about difficulties encountered regarding the user's request. A message should only be provided if information is requested or something go wrong and some instruction has to be sent to the user. Otherwise, simply say 'N/A'"
    ),
  operations: z
    .array(
      z.object({
        action: z
          .string()
          .describe(
            "Operation to perform on the block: update|append|move|create|reorder|delete"
          ),
        blockUid: z
          .string()
          .optional()
          .nullable()
          .describe(
            "The unique UID of the existing block being updated, completed or moved (make sure that it's strickly 9-characters) (optional)"
          ),
        newContent: z
          .string()
          .optional()
          .nullable()
          .describe(
            "The new content to create or to insert in the block, replacing or appended to the former (optional)"
          ),
        newChildren: z
          .string()
          .optional()
          .nullable()
          .describe(
            "If the block created has to be the parent of a rich content to be insert as children, provide its this content here. (optional)"
          ),
        targetParentUid: z
          .string()
          .optional()
          .nullable()
          .describe(
            "If action is 'create', 'move' or 'reorder', the unique AND existing UID (make sure that it's strickly 9-characters) of the parent block where this block should be created or inserted or reordered, or 'root' if the first level blocks are concerned. If target has no existing identifier, set to 'new', NEVER make up any identifier ! (optional)"
          ),
        newOrder: z
          .array(z.string())
          .optional()
          .nullable()
          .describe(
            "If action is 'reorder', an array of the UIDs (only provided ones, and make sure that it's strickly 9-characters, without parentheses!) representing the new order of the concerned blocks (optional)"
          ),
        position: z
          .number()
          .optional()
          .nullable()
          .describe(
            "Position (as a number) of a created or moved block in its new level. 0 is first, ignore this key to append as last block (optional)"
          ),
        format: z
          .object({
            open: z
              .boolean()
              .optional()
              .nullable()
              .describe("block is expanded (true) or collapsed (false)"),
            heading: z
              .number()
              .optional()
              .nullable()
              .describe("normal text is 0 (default), heading is 1|2|3"),
            "children-view-type": z
              .string()
              .optional()
              .nullable()
              .describe("bullet|numbered|document"),
          })
          .optional()
          .nullable()
          .describe(
            "Block format options: needed if action is 'format', optional if 'update', 'append' or 'create'"
          ),
      })
    )
    .describe("Array of all the operations to perform on the affected blocks"),
});

// System message
const sys_msg = new SystemMessage({
  content: `You are a powerful assistant helping the user to update rich and structured data. The data is presented in the form of an outliner, with a set of hierarchically organized bullets (each hierarchical level is marked by two additional spaces before the dash). Each bullet (also called a 'block') provided in input has a 9-alphanumerical-characters (eventualy including '-' and '_') between double parentheses (now named 'UID').
  Based on the user's request, asking for modifications or additions to the outline, you must propose a set of precise operations to be performed for each affected block, only modifying or adding elements directly concerned by the user's request. Be judicious in selecting operations to be as efficient as possible, knowing that the operations will be executed sequentially. Here is the list of operations you can propose:
    - "update": replace the content of a block by a new content (use this instead of deleting then creating a new block).
    - "append": add content to the existing content in a block.
    - "move": move a block to another location, under an existing block in the structure (or a 'new' block without identifier), and to a determined position.
    - "create": create new content in a new block, inserted under a determined target parent block, and provide eventually children blocks whose content is to generate at once in the 'newChildren' key.
    - "reorder": modify the order of a set of blocks under a determined parent block,
    - "format": to change native block format parameters (heading level, children opened or not, and view type of children: basic bullet (default), numbered or without bullet (document)).
    - "delete": remove a block (and all its children)

  IMPORTANT intructions to update or create content: if the user requests
  - to highlight some content, use this syntax: ^^highlighted^^
  - to underline: __underlined__
  - to cross out (strikethrough): ~~crossed out~~
  - to write Latex code: $$Use Katex syntax$$
  - to insert checkbox (always to prepend), uncheked: {{[[TODO]]}}, checked: {{[[DONE]]}}
  - to reference or mention some page name: [[page name]]
  - to reference to an existing block: ((UID)), or embeding it with its children: {{embed: ((UID))}}
  - to replace some content by an alias: [alias](content or reference)

  IMPORTANT: if a block has to be updated with a structured content, update the block only with the top level part (simple line, without linebreak) of the new content, and in other operations create children blocks to the updated block, eventually with their respective rich children, to better fit to the outliner UI. If you have to create multiple blocks at the same level, it requires multiple 'create' operations.

  If the user's request doesn't involve any operation on the outline but asks a question about it, reply with a message.

  OUTPUT LANGUAGE: your response will always be in the same language as the user request and provided outline.

  Your precise response will be an JSON object, formatted according to the provided JSON schema. If a key is optional and your response would be 'null', just IGNORE this key!`,
});

// Node
const transformer = async (state: typeof TransformerState.State) => {
  let notCompletedOperations = state.notCompletedOperations || "";
  let lastTurn = state.lastTurn || false;
  // LLM with bound tool
  let llm: StructuredOutputType;

  const tokensUsageCallback = CallbackManager.fromHandlers({
    async handleLLMEnd(output: any) {
      console.log("Used tokens", output.llmOutput?.tokenUsage);
      const usage = {
        input_tokens: output.llmOutput?.tokenUsage?.promptTokens,
        output_tokens: output.llmOutput?.tokenUsage?.completionTokens,
      };
      updateTokenCounter("gpt-4o", usage);
    },
  });

  llm = new ChatOpenAI({
    model: "gpt-4o",
    apiKey: openaiLibrary.apiKey,
    configuration: {
      baseURL: openaiLibrary.baseURL,
    },
    callbackManager: tokensUsageCallback,
  });

  // Using Groq:
  // llm = new ChatOpenAI({
  //   model: "llama-3.3-70b-versatile",
  //   apiKey: groqLibrary.apiKey,
  //   configuration: {
  //     baseURL: groqLibrary.baseURL,
  //   },
  //   callbackManager: tokensUsageCallback,
  // });

  llm = llm.withStructuredOutput(transformerSchema);
  let messages = [sys_msg].concat(state["messages"]);
  if (notCompletedOperations) {
    const outlineCurrentState = await getTemplateForPostProcessing(
      state.rootUid,
      99,
      [],
      false
    );
    messages = messages.concat(
      new HumanMessage(`Based on initial user request and the current state of the outliner provided below (potentially new blocks created), propose again, with complete information (e.g. replacing "new" in 'targetParentUid' key by an existing 9-character identifier), the following remaining operations:
    ${notCompletedOperations}
    Here is the current state of the outliner:
    ${outlineCurrentState.stringified}`)
    );
    console.log("messages :>> ", messages);
    lastTurn = true;
    notCompletedOperations = "";
  }
  const begin = performance.now();
  const response = await llm.invoke(messages);
  const end = performance.now();
  console.log("LLM response :>> ", response);
  console.log(
    "Transformer request duration: ",
    `${((end - begin) / 1000).toFixed(2)}s`
  );
  return {
    messages: [new AIMessage(response.message)],
    remainingOperations:
      response.operations && response.operations.length
        ? JSON.stringify(response.operations)
        : "",
    notCompletedOperations,
    lastTurn,
  };
};

const agent = async (state: typeof TransformerState.State) => {
  let notCompletedOperations = state.notCompletedOperations;
  let operations = JSON.parse(state.remainingOperations);
  const nextOperation = operations && operations.length ? operations[0] : null;
  if (nextOperation) {
    let {
      action,
      blockUid,
      targetParentUid,
      newContent,
      newChildren,
      newOrder,
      position,
      format,
    } = nextOperation;
    blockUid && (blockUid = extractNormalizedUidFromRef(blockUid, false));
    targetParentUid &&
      (targetParentUid = extractNormalizedUidFromRef(targetParentUid, false));
    newChildren && (newChildren = sanitizeJSONstring(newChildren));
    newOrder &&
      newOrder.length &&
      (newOrder = newOrder.map((item: string) => sanitizeJSONstring(item)));

    switch (action) {
      case "update":
        console.log("update! :>> ");
        updateBlock({
          blockUid,
          newContent,
          format,
        });
        if (newChildren)
          await insertStructuredAIResponse(blockUid, newChildren);
        break;
      case "append":
        console.log("append! :>> ");
        await insertStructuredAIResponse(
          blockUid,
          sanitizeJSONstring(newContent),
          false,
          format
        );
        if (newChildren)
          await insertStructuredAIResponse(blockUid, newChildren);
        break;
      case "move":
        console.log("move! :>> ");
        if (!targetParentUid || targetParentUid === "new")
          notCompletedOperations += JSON.stringify(nextOperation) + "\n";
        else
          moveBlock({
            blockUid,
            targetParentUid,
            order: position,
          });
        break;
      case "create":
        console.log("create block! :>> ");
        if (!targetParentUid || targetParentUid === "new")
          notCompletedOperations += JSON.stringify(nextOperation) + "\n";
        else {
          const newBlockUid = await createChildBlock(
            targetParentUid === "root" ? state.rootUid : targetParentUid,
            newContent,
            position,
            format?.open,
            format?.heading
          );
          if (newChildren)
            await insertStructuredAIResponse(newBlockUid, newChildren, true);
        }
        break;
      case "reorder":
        console.log("targetParentUid :>> ", targetParentUid);
        console.log("newOrder :>> ", newOrder);
        if (!targetParentUid || targetParentUid === "new")
          notCompletedOperations += JSON.stringify(nextOperation) + "\n";
        else
          reorderBlocks({
            parentUid:
              !targetParentUid || targetParentUid === "root"
                ? state.rootUid
                : targetParentUid,
            newOrder,
          });
        console.log("reorder! :>> ");
        break;
      case "format":
        updateBlock({ blockUid, newContent: undefined, format });
        break;
      case "delete":
        console.log("reorder! :>> ");
        deleteBlock(blockUid);
        break;
    }
    operations.shift();
  } else operations = [];
  // await new Promise((resolve) => setTimeout(resolve, 500));
  return {
    remainingOperations: operations.length ? JSON.stringify(operations) : "",
    notCompletedOperations,
  };
};

const continueOperations = (state: typeof TransformerState.State) => {
  if (state.remainingOperations) return "agent";
  else if (state.notCompletedOperations) return "transformer";
  return "__end__";
};

// Build graph
const builder = new StateGraph(TransformerState);
builder
  .addNode("transformer", transformer)
  .addNode("agent", agent)

  .addEdge(START, "transformer")
  .addEdge("transformer", "agent")
  .addConditionalEdges("agent", continueOperations);
//   // If the latest message (result) from assistant is a tool call -> tools_condition routes to tools
//   // If the latest message (result) from assistant is a not a tool call -> tools_condition routes to END
//   toolsCondition
// )

// Compile graph

export const transformerAgent = builder.compile();

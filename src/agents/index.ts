import type { AgentMap } from '../lib/pipelineTypes';
import { createAgent1 } from './agent1';
import { createFullScriptEditor } from './fullScriptEditor';
import { createFullScriptWriter } from './fullScriptWriter';
import { createSegmentWriter } from './segmentWriter';
import { createSegmentEditor } from './segmentEditor';
import { createAssembler } from './assembler';
import { createAgent6Stub } from './stubs/agent6Stub';

export function createAgentMap(): AgentMap {
  return {
    agent1: createAgent1(),
    fullScriptEditor: createFullScriptEditor(),
    fullScriptWriter: createFullScriptWriter(),
    segmentWriter: createSegmentWriter(),
    segmentEditor: createSegmentEditor(),
    assembler: createAssembler(),
    agent6: createAgent6Stub(),
  };
}

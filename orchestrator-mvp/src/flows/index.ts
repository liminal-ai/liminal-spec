import { SINGLE_STORY_FLOW } from "./single-story";
import { TEAM_IMPL_FLOW } from "./team-impl";
import { TEAM_SPEC_FLOW } from "./team-spec";
import type { FlowDefinition, FlowId } from "../types";

const FLOW_REGISTRY: Record<FlowId, FlowDefinition> = {
  "team-impl": TEAM_IMPL_FLOW,
  "team-spec": TEAM_SPEC_FLOW,
  "single-story": SINGLE_STORY_FLOW,
};

export function getFlowDefinition(flowId: FlowId): FlowDefinition {
  return FLOW_REGISTRY[flowId];
}

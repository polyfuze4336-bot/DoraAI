import type {
  IntelligenceInterpretation,
  IntelligenceInterpretationInput,
  IntelligenceInterpreter,
} from "@dora/intelligence";

export interface FoundryInterpretationPort {
  invoke(input: {
    readonly task: "interpret-intelligence";
    readonly instructions: string;
    readonly evidence: IntelligenceInterpretationInput;
  }): Promise<IntelligenceInterpretation>;
}

export class FoundryIntelligenceInterpreter implements IntelligenceInterpreter {
  readonly id = "foundry-intelligence-interpreter-v1";

  constructor(private readonly port: FoundryInterpretationPort) {}

  interpret(
    input: IntelligenceInterpretationInput,
  ): Promise<IntelligenceInterpretation> {
    return this.port.invoke({
      task: "interpret-intelligence",
      instructions: [
        "Treat facts, calculations, and model forecasts as immutable evidence.",
        "Do not calculate, alter, or invent numeric forecasts.",
        "Generate hypotheses with falsification criteria, scenario interpretation, executive explanation, and recommendations.",
        "Use cautious language for potential causal drivers and cite supplied research.",
        "State evidence gaps and do not imply simulated or unavailable sources were used.",
      ].join(" "),
      evidence: input,
    });
  }
}

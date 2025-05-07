import ollama from "ollama";

export function getDefaultModelList() {
  return ["qwen3:8b", "deepseek-r1:1.5b"];
}

export function getLocalModelList() {
  return ollama.list();
}

export function getModelInfo(modelId: string) {
  return ollama.show({
    model: modelId,
  });
}

export async function pullModel(modelId: string) {
  const pulling = await ollama.pull({
    model: modelId,
    stream: true,
  });
  return pulling;
}

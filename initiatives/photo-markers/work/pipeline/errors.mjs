export class ExportError extends Error {
  constructor(stage, message, details) {
    super(message);
    this.name = "ExportError";
    this.stage = stage;
    this.details = details;
  }
}
export async function atStage(stage, operation) {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof ExportError) throw error;
    throw new ExportError(stage, error.message || String(error));
  }
}

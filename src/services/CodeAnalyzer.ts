import { FileWithContent } from "../components/FileUploader";

export interface FileAnalysis {
  fileName: string;
  fileMetrics: {
    linesOfCode: number;
    totalFunctions: number;
    averageComplexity: number;
  };
  functions: Array<{
    name: string;
    complexity: number;
  }>;
}

export interface ProjectAnalysisResult {
  files: FileAnalysis[];
  functions: Array<{
    name: string;
    complexity: number;
    fileName: string;
  }>;
  dependencies: Array<{
    callerFileName: string;
    calleeFileName: string;
    isCrossFile: boolean;
  }>;
  projectMetrics: {
    totalFiles: number;
    totalLinesOfCode: number;
    totalFunctions: number;
    totalDependencies: number;
    highComplexityFunctions: number;
    mostComplexFile: { fileName: string };
    mostDependedOnFile: { fileName: string };
    crossFileDependencies: number;
    averageComplexity: number;
  };
  // Add additional fields as needed
}

export async function generateProjectAnalysis(
  files: FileWithContent[]
): Promise<ProjectAnalysisResult> {
  // Build a payload using file content for AI analysis
  const payload = {
    files: files.map((file) => ({
      name: file.name,
      content: file.content,
    })),
  };

  try {
    const response = await fetch(process.env.REACT_APP_AI_ENDPOINT as string, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.REACT_APP_AI_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error("AI analysis request failed with status: " + response.status);
    }

    return await response.json();
  } catch (error) {
    console.error("Error during AI analysis:", error);
    throw error;
  }
}

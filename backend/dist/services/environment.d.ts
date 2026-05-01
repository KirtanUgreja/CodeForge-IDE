type ProjectEnvironment = 'python' | 'node' | 'java' | 'go' | 'rust' | 'cpp' | 'php' | 'ruby' | 'multi' | 'base';
interface EnvironmentResult {
    environment: ProjectEnvironment;
    reason: string;
}
export declare function detectEnvironment(projectPath: string): EnvironmentResult;
export declare function getContainerImage(environment: ProjectEnvironment): string;
export {};

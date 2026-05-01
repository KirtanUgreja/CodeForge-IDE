import * as fs from 'fs'
import * as path from 'path'

type ProjectEnvironment = 'python' | 'node' | 'java' | 'go' | 'rust' | 'cpp' | 'php' | 'ruby' | 'multi' | 'base'

interface EnvironmentResult {
    environment: ProjectEnvironment
    reason: string
}

export function detectEnvironment(projectPath: string): EnvironmentResult {
    const files = fs.readdirSync(projectPath)

    // Check root level
    const hasPython =
        files.includes('requirements.txt') ||
        files.includes('setup.py') ||
        files.includes('pyproject.toml') ||
        files.includes('Pipfile') ||
        files.some(f => f.endsWith('.py'))

    const hasNode =
        files.includes('package.json') ||
        files.some(f => f.endsWith('.js') || f.endsWith('.ts') || f.endsWith('.jsx') || f.endsWith('.tsx'))

    const hasGo =
        files.includes('go.mod') ||
        files.includes('go.sum') ||
        files.some(f => f.endsWith('.go'))

    const hasRust =
        files.includes('Cargo.toml') ||
        files.some(f => f.endsWith('.rs'))

    const hasCpp =
        files.includes('CMakeLists.txt') ||
        files.includes('Makefile') ||
        files.some(f => f.endsWith('.cpp') || f.endsWith('.hpp') || f.endsWith('.c') || f.endsWith('.h'))

    const hasPhp =
        files.includes('composer.json') ||
        files.some(f => f.endsWith('.php'))

    const hasRuby =
        files.includes('Gemfile') ||
        files.some(f => f.endsWith('.rb'))

    const hasJava =
        files.includes('pom.xml') ||
        files.includes('build.gradle') ||
        files.some(f => f.endsWith('.java'))

    // Check subdirectories for package.json
    if (!hasNode) {
        for (const file of files) {
            const fullPath = path.join(projectPath, file)
            try {
                if (fs.statSync(fullPath).isDirectory()) {
                    const subFiles = fs.readdirSync(fullPath)
                    if (subFiles.includes('package.json')) {
                        return { environment: 'node', reason: 'Found package.json in subdirectory' }
                    }
                }
            } catch (e) {
                // Skip files that can't be statted
            }
        }
    }

    // Detection priority
    if (hasPython && hasNode) return { environment: 'multi', reason: 'Found both Python and Node.js files' }
    if (hasPython) return { environment: 'python', reason: 'Found Python files' }
    if (hasNode) return { environment: 'node', reason: 'Found Node.js/JavaScript files' }
    if (hasGo) return { environment: 'go', reason: 'Found Go files' }
    if (hasRust) return { environment: 'rust', reason: 'Found Rust files' }
    if (hasCpp) return { environment: 'cpp', reason: 'Found C++/C files' }
    if (hasPhp) return { environment: 'php', reason: 'Found PHP files' }
    if (hasRuby) return { environment: 'ruby', reason: 'Found Ruby files' }
    if (hasJava) return { environment: 'java', reason: 'Found Java files' }

    return { environment: 'base', reason: 'Default to base environment' }
}

export function getContainerImage(environment: ProjectEnvironment): string {
    const images: Record<ProjectEnvironment, string> = {
        python: 'codeblocking/python',
        node: 'codeblocking/node',
        java: 'codeblocking/java',
        go: 'codeblocking/go',
        rust: 'codeblocking/rust',
        cpp: 'codeblocking/cpp',
        php: 'codeblocking/php',
        ruby: 'codeblocking/ruby',
        multi: 'codeblocking/node',
        base: 'codeblocking/base'
    }
    return images[environment]
}

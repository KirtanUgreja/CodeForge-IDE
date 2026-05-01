"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectEnvironment = detectEnvironment;
exports.getContainerImage = getContainerImage;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
function detectEnvironment(projectPath) {
    const files = fs.readdirSync(projectPath);
    // Check root level
    const hasPython = files.includes('requirements.txt') ||
        files.includes('setup.py') ||
        files.includes('pyproject.toml') ||
        files.includes('Pipfile') ||
        files.some(f => f.endsWith('.py'));
    const hasNode = files.includes('package.json') ||
        files.some(f => f.endsWith('.js') || f.endsWith('.ts') || f.endsWith('.jsx') || f.endsWith('.tsx'));
    const hasGo = files.includes('go.mod') ||
        files.includes('go.sum') ||
        files.some(f => f.endsWith('.go'));
    const hasRust = files.includes('Cargo.toml') ||
        files.some(f => f.endsWith('.rs'));
    const hasCpp = files.includes('CMakeLists.txt') ||
        files.includes('Makefile') ||
        files.some(f => f.endsWith('.cpp') || f.endsWith('.hpp') || f.endsWith('.c') || f.endsWith('.h'));
    const hasPhp = files.includes('composer.json') ||
        files.some(f => f.endsWith('.php'));
    const hasRuby = files.includes('Gemfile') ||
        files.some(f => f.endsWith('.rb'));
    const hasJava = files.includes('pom.xml') ||
        files.includes('build.gradle') ||
        files.some(f => f.endsWith('.java'));
    // Check subdirectories for package.json
    if (!hasNode) {
        for (const file of files) {
            const fullPath = path.join(projectPath, file);
            try {
                if (fs.statSync(fullPath).isDirectory()) {
                    const subFiles = fs.readdirSync(fullPath);
                    if (subFiles.includes('package.json')) {
                        return { environment: 'node', reason: 'Found package.json in subdirectory' };
                    }
                }
            }
            catch (e) {
                // Skip files that can't be statted
            }
        }
    }
    // Detection priority
    if (hasPython && hasNode)
        return { environment: 'multi', reason: 'Found both Python and Node.js files' };
    if (hasPython)
        return { environment: 'python', reason: 'Found Python files' };
    if (hasNode)
        return { environment: 'node', reason: 'Found Node.js/JavaScript files' };
    if (hasGo)
        return { environment: 'go', reason: 'Found Go files' };
    if (hasRust)
        return { environment: 'rust', reason: 'Found Rust files' };
    if (hasCpp)
        return { environment: 'cpp', reason: 'Found C++/C files' };
    if (hasPhp)
        return { environment: 'php', reason: 'Found PHP files' };
    if (hasRuby)
        return { environment: 'ruby', reason: 'Found Ruby files' };
    if (hasJava)
        return { environment: 'java', reason: 'Found Java files' };
    return { environment: 'base', reason: 'Default to base environment' };
}
function getContainerImage(environment) {
    const images = {
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
    };
    return images[environment];
}

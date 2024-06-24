"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
const child_process_1 = require("child_process");
const path = require("path");
const vscode = require("vscode");
function activate(context) {
    let disposable = vscode.commands.registerCommand('extension.loadMagicCommands', () => __awaiter(this, void 0, void 0, function* () {
        const editor = vscode.window.activeNotebookEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active notebook editor found.');
            return;
        }
        const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
        const notebook = editor.notebook;
        if (notebook.notebookType !== 'jupyter-notebook') {
            vscode.window.showErrorMessage('The active editor is not a Jupyter Notebook.');
            return;
        }
        const edits = new vscode.WorkspaceEdit();
        for (const cell of notebook.getCells()) {
            if (cell.kind === vscode.NotebookCellKind.Code) {
                const cellText = cell.document.getText();
                if (cellText.startsWith('# %load')) {
                    const uncommentedLine = cellText.replace('# %load', '%load');
                    const range = new vscode.Range(0, 0, cell.document.lineCount, 0);
                    edits.replace(cell.document.uri, range, uncommentedLine);
                }
            }
        }
        yield vscode.workspace.applyEdit(edits);
        
        for (const cell of notebook.getCells()) {
            if (cell.kind === vscode.NotebookCellKind.Code) {
                try {
                    yield vscode.commands.executeCommand('notebook.cell.execute', { start: cell.index, end: cell.index + 1 });
                }
                catch (error) {
                    // console.error(`Error executing cell ${cell.index}:`, error);
                }
            }
        }
        
        const checkPackage = (pkg) => {
            const scriptPath = path.join(context.extensionPath, 'scripts', 'check_package.py');
            console.log(scriptPath);
            return new Promise((resolve) => {
                (0, child_process_1.exec)(`python "${scriptPath}" ${pkg}`, (error, stdout) => {
                    if (error) {
                        resolve(false);
                    }
                    else {
                        resolve(stdout.trim() === 'True');
                    }
                });
            });
        };
        const processChunks = (cell) => __awaiter(this, void 0, void 0, function* () {
            const cellText = cell.document.getText();
            const lines = cellText.split('\n');
            let newLines = [];
            let chunk = [];
            for (let line of lines) {
                if (line.startsWith('import') || line.startsWith('from')) {
                    chunk.push(line);
                }
                else {
                    if (chunk.length > 0) {
                        const firstImport = chunk[0].split(' ')[1];
                        const isUserCustom = yield checkPackage(firstImport);
                        if (!isUserCustom) {
                            newLines.push(...chunk);
                        }
                        chunk = [];
                    }
                    newLines.push(line);
                }
            }
            // Check the last chunk
            if (chunk.length > 0) {
                const firstImport = chunk[0].split(' ')[1];
                const isUserCustom = yield checkPackage(firstImport);
                if (!isUserCustom) {
                    newLines.push(...chunk);
                }
            }
            const modifiedCellText = newLines.join('\n');
            if (modifiedCellText !== cellText) {
                const range = new vscode.Range(0, 0, cell.document.lineCount, 0);
                edits.replace(cell.document.uri, range, modifiedCellText);
            }
        });
        for (const cell of notebook.getCells()) {
            if (cell.kind === vscode.NotebookCellKind.Code) {
                
                yield processChunks(cell);
            }
        }
        
        yield vscode.workspace.applyEdit(edits);
        vscode.window.showInformationMessage('Magic commands loaded and user-custom packages removed successfully.');
    }));
    context.subscriptions.push(disposable);
}
exports.activate = activate;
function deactivate() { }
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map
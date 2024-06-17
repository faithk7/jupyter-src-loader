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
const vscode = require("vscode");
function activate(context) {
    let disposable = vscode.commands.registerCommand('extension.loadMagicCommands', () => __awaiter(this, void 0, void 0, function* () {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active editor found.');
            return;
        }
        const document = editor.document;
        if (document.languageId !== 'jupyter') {
            vscode.window.showErrorMessage('The active editor is not a Jupyter Notebook.');
            return;
        }
        const notebook = vscode.workspace.notebookDocuments.find(doc => doc.uri === document.uri);
        if (!notebook) {
            vscode.window.showErrorMessage('Unable to find the active Jupyter Notebook.');
            return;
        }
        for (const cell of notebook.getCells()) {
            if (cell.kind === vscode.NotebookCellKind.Code) {
                const cellText = cell.document.getText();
                if (cellText.startsWith('# %load')) {
                    const commentedLine = cellText.replace('# %load', '%load');
                    const edit = vscode.NotebookEdit.replaceCellContent(cell.index, commentedLine);
                    yield notebook.applyEdit(edit);
                    yield vscode.commands.executeCommand('jupyter.runallcells');
                }
            }
        }
        vscode.window.showInformationMessage('Magic commands loaded successfully.');
    }));
    context.subscriptions.push(disposable);
}
exports.activate = activate;
function deactivate() { }
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map
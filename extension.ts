import { exec } from 'child_process';
import * as path from 'path';
import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
    let disposable = vscode.commands.registerCommand('extension.loadMagicCommands', async () => {
        const editor = vscode.window.activeNotebookEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active notebook editor found.');
            return;
        }

        const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

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

        await vscode.workspace.applyEdit(edits);

        for (const cell of notebook.getCells()) {
            if (cell.kind === vscode.NotebookCellKind.Code) {
                try {
                    await vscode.commands.executeCommand('notebook.cell.execute', { start: cell.index, end: cell.index + 1 });
                } catch (error) {
                    // console.error(`Error executing cell ${cell.index}:`, error);
                }
            }
        }

        const checkPackage = (pkg: string): Promise<boolean> => {
            const scriptPath = path.join(context.extensionPath, 'scripts', 'check_package.py');
            console.log(scriptPath);
            return new Promise((resolve) => {
                exec(`python "${scriptPath}" ${pkg}`, (error, stdout) => {
                    if (error) {
                        resolve(false);
                    } else {
                        resolve(stdout.trim() === 'True');
                    }
                });
            });
        };

        const processChunks = async (cell: vscode.NotebookCell) => {
            const cellText = cell.document.getText();
            const lines = cellText.split('\n');
            let newLines: string[] = [];
            let chunk: string[] = [];

            for (let line of lines) {
                if (line.startsWith('import') || line.startsWith('from')) {
                    chunk.push(line);
                } else {
                    if (chunk.length > 0) {
                        const firstImport = chunk[0].split(' ')[1];
                        const isUserCustom = await checkPackage(firstImport);
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
                const isUserCustom = await checkPackage(firstImport);
                if (!isUserCustom) {
                    newLines.push(...chunk);
                }
            }

            const modifiedCellText = newLines.join('\n');
            if (modifiedCellText !== cellText) {
                const range = new vscode.Range(0, 0, cell.document.lineCount, 0);
                edits.replace(cell.document.uri, range, modifiedCellText);
            }
        };


        for (const cell of notebook.getCells()) {
            if (cell.kind === vscode.NotebookCellKind.Code) {

                await processChunks(cell);
            }
        }

        await vscode.workspace.applyEdit(edits);

        vscode.window.showInformationMessage('Magic commands loaded and user-custom packages removed successfully.');
    });

    context.subscriptions.push(disposable);
}

export function deactivate() {}

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

        const notebook = editor.notebook;
        if (notebook.notebookType !== 'jupyter-notebook') {
            vscode.window.showErrorMessage('The active editor is not a Jupyter Notebook.');
            return;
        }

        const editsUncomment = new vscode.WorkspaceEdit();

        await uncommentLoadMagicCommands(notebook, editsUncomment);
        await vscode.workspace.applyEdit(editsUncomment);

        await executeCells(notebook);

        const editsRemoveCustomPackages = new vscode.WorkspaceEdit();
        await processCells(notebook, context, editsRemoveCustomPackages);
        await vscode.workspace.applyEdit(editsRemoveCustomPackages);

        vscode.window.showInformationMessage('Magic commands loaded and user-custom packages removed successfully.');
    });

    context.subscriptions.push(disposable);
}

export function deactivate() {}

async function uncommentLoadMagicCommands(notebook: vscode.NotebookDocument, edits: vscode.WorkspaceEdit) {
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
}

async function executeCells(notebook: vscode.NotebookDocument) {
    for (const cell of notebook.getCells()) {
        if (cell.kind === vscode.NotebookCellKind.Code) {
            try {
                await vscode.commands.executeCommand('notebook.cell.execute', { start: cell.index, end: cell.index + 1 });
            } catch (error) {
                // console.error(`Error executing cell ${cell.index}:`, error);
            }
        }
    }
}

async function processCells(notebook: vscode.NotebookDocument, context: vscode.ExtensionContext, edits: vscode.WorkspaceEdit) {
    for (const cell of notebook.getCells()) {
        if (cell.kind === vscode.NotebookCellKind.Code) {
            await processChunks(cell, context, edits);
        }
    }
}

async function processChunks(cell: vscode.NotebookCell, context: vscode.ExtensionContext, edits: vscode.WorkspaceEdit) {
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
                const isUserCustom = await checkPackage(firstImport, context);
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
        const isUserCustom = await checkPackage(firstImport, context);
        if (!isUserCustom) {
            newLines.push(...chunk);
        }
    }

    const modifiedCellText = newLines.join('\n');
    if (modifiedCellText !== cellText) {
        const range = new vscode.Range(0, 0, cell.document.lineCount, 0);
        edits.replace(cell.document.uri, range, modifiedCellText);
    }
}

function checkPackage(pkg: string, context: vscode.ExtensionContext): Promise<boolean> {
    const scriptPath = path.join(context.extensionPath, 'scripts', 'check_package.py');
    return new Promise((resolve) => {
        exec(`python "${scriptPath}" ${pkg}`, (error, stdout) => {
            if (error) {
                resolve(false);
            } else {
                resolve(stdout.trim() === 'True');
            }
        });
    });
}

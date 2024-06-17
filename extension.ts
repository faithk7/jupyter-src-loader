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

    vscode.window.showInformationMessage('Magic commands loaded successfully.');
  });

  context.subscriptions.push(disposable);
}

export function deactivate() {}

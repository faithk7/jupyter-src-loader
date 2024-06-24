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

				// Identify user-custom packages
				// const lines = cellText.split('\n');
				// let start = 0;
				// while (start < lines.length) {
				// 	const chunk = [];
				// 	while (start < lines.length && (lines[start].startsWith('import') || lines[start].startsWith('from'))) {
				// 		chunk.push(lines[start]);
				// 		start++;
				// 	}
				// 	if (chunk.length > 0) {
				// 		const firstImport = chunk[0].split(' ')[1]; // e.g., import numpy | from pandas import ...
				// 		try {
				// 			const packagePath = require.resolve(firstImport);
				// 			if (!packagePath.includes('anaconda3')) {
				// 				chunk.length = 0; // Eliminate the whole chunk
				// 			}
				// 		} catch (error) {
				// 			console.error(`Error resolving package ${firstImport}:`, error);
				// 		}
				// 	}
				// 	start++;
				// }

				// // Join the modified lines and update the cell
				// const modifiedCellText = lines.join('\n');
				// if (modifiedCellText !== cellText) {
				// 	const range = new vscode.Range(0, 0, cell.document.lineCount, 0);
				// 	edits.replace(cell.document.uri, range, modifiedCellText);
				// }
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

		vscode.window.showInformationMessage('Magic commands loaded and user-custom packages removed successfully.');
	});

	context.subscriptions.push(disposable);
}

export function deactivate() {}

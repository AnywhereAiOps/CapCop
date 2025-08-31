import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
	console.log('CapCop extension is now active!');

	let disposable = vscode.commands.registerCommand('capcop.helloWorld', () => {
		vscode.window.showInformationMessage('Hello World from CapCop!');
	});

	context.subscriptions.push(disposable);
}

export function deactivate() {}
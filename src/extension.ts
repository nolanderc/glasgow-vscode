// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import {
	LanguageClient,
	LanguageClientOptions,
	ServerOptions,
	TransportKind,
	Executable
} from 'vscode-languageclient/node';
import { mkdirp } from 'mkdirp';
import * as fs from 'fs';
import { spawnSync } from 'child_process';

let client: LanguageClient | null = null;
let config: vscode.WorkspaceConfiguration;

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {
	config = vscode.workspace.getConfiguration("glasgow", { languageId: 'wgsl' });

	context.subscriptions.push(
		vscode.commands.registerCommand('glasgow.restartClient', () => startClient(context)),
	);
	context.subscriptions.push(
		vscode.commands.registerCommand('glasgow.stopClient', () => stopClient()),
	);
	context.subscriptions.push(
		vscode.commands.registerCommand('glasgow.download', async () => {
			await stopClient();
			await downloadLatestRelease(context, { force: true });
			vscode.window.showInformationMessage('updated `glasgow` to version: ' + getVersionString());
			await startClient(context);
		}),
	);
	context.subscriptions.push(
		vscode.commands.registerCommand('glasgow.version', () => {
			vscode.window.showInformationMessage('version: ' + getVersionString());
		}),
	);

	await startClient(context);
}

// This method is called when your extension is deactivated
export async function deactivate() {
	await stopClient();
}

async function startClient(context: vscode.ExtensionContext) {
	if (client) {
		await stopClient();
		client = null;
	}

	var executable_path: string | undefined = config.get('path');
	if (!executable_path) {
		const downloaded_path = await downloadLatestRelease(context);
		if (!downloaded_path) return;
		executable_path = downloaded_path.fsPath;
	}

	let client_options: LanguageClientOptions = {
		documentSelector: [
			{ scheme: 'file', language: 'wgsl' }
		]
	};
	let executable: Executable = {
		command: executable_path,
		transport: TransportKind.stdio,
	};
	let server_options: ServerOptions = executable;
	let tmp_client = new LanguageClient("glasgow", server_options, client_options);
	await tmp_client.start();
	client = tmp_client;
	vscode.window.showInformationMessage("started glasgow!");
}

async function stopClient() {
	if (!client) return;
	vscode.window.showInformationMessage("stopping glasgow...");
	await client.stop();
	client = null;
}

async function downloadLatestRelease(context: vscode.ExtensionContext, options?: { force: boolean }): Promise<vscode.Uri | null> {
	if (!options?.force) {
		const cargo_root = vscode.Uri.file(process.env['CARGO_HOME'] ?? (process.env['HOME'] + '/.cargo/'));
		const pre_installed_path = vscode.Uri.joinPath(cargo_root, "bin", getExecutableName());
		if (fs.existsSync(pre_installed_path.fsPath)) {
			return pre_installed_path;
		}
	}

	const install_directory = getInstallDirectory(context);
	return await vscode.window.withProgress({
		title: "Installing glasgow...",
		location: vscode.ProgressLocation.Notification,
	}, async progress => {
		progress.report({ message: "Running `cargo install glasgow`..." });

		if (!fs.existsSync(install_directory.fsPath)) {
			await mkdirp(install_directory.fsPath)
		}

		spawnSync('cargo', ['install', 'glasgow', '--root', install_directory.fsPath])

		const exe_path = getInstalledExecutablePath(context);
		if (!fs.existsSync(exe_path.fsPath)) {
			vscode.window.showErrorMessage("Installation failed");
			return null;
		}

		await config.update("path", exe_path.fsPath, true);

		return exe_path;
	});
}

function getInstalledExecutablePath(context: vscode.ExtensionContext): vscode.Uri {
	const install_directory = getInstallDirectory(context);
	return vscode.Uri.joinPath(install_directory, "bin", getExecutableName());
}

function getExecutableName(): string {
	const extension = process.platform == 'win32' ? '.exe' : '';
	return "glasgow" + extension;
}

function getInstallDirectory(context: vscode.ExtensionContext): vscode.Uri {
	return vscode.Uri.joinPath(context.globalStorageUri, "glasgow_install");
}

function getVersionString(): string | null {
	const exe_path: string | undefined = config.get('path');
	if (exe_path) {
		const result = spawnSync(exe_path, ['--version']);
		return result.stdout.toString();
	}
	return null;
}

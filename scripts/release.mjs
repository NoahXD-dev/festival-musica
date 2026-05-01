import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const mode = process.argv[2] || 'all';

function run(command, description) {
    console.log(`\n> ${description}`);
    console.log(`$ ${command}`);
    execSync(command, {
        cwd: projectRoot,
        stdio: 'inherit'
    });
}

function getVersionTag() {
    const packageJsonPath = path.resolve(projectRoot, 'package.json');
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
    return `v${packageJson.version}`;
}

function createGitHubRelease() {
    const tag = getVersionTag();
    run(`gh release create ${tag} --generate-notes --title "${tag}"`, `Creando GitHub Release ${tag}`);
}

if (mode === 'github') {
    createGitHubRelease();
    process.exit(0);
}

run('npm version patch', 'Incrementando version patch y creando tag');
run('npm run deploy', 'Publicando build en gh-pages');
run('git push', 'Publicando commits en la rama actual');
run('git push --tags', 'Publicando tags');
createGitHubRelease();

const fs = require('fs');
const path = require('path');

// ==========================================
// 【設定】対象ファイルの名前をここに指定します
// 別のプロジェクトで使う場合は、ここを書き換えるだけでOKです
const TARGET_FILE = 'App.js'; 
// ==========================================

const changesFile = path.join(__dirname, 'changes.json');
const targetFile = path.join(__dirname, TARGET_FILE);

if (!fs.existsSync(changesFile)) {
    process.exit(0);
}

if (!fs.existsSync(targetFile)) {
    console.error(`エラー: 対象ファイル (${TARGET_FILE}) が見つかりません。`);
    process.exit(1);
}

const now = new Date();
const yyyy = now.getFullYear();
const m = now.getMonth() + 1;
const d = now.getDate();
const hh = String(now.getHours()).padStart(2, '0');
const min = String(now.getMinutes()).padStart(2, '0');
const currentDateTimeStr = `${yyyy}.${m}.${d}, ${hh}:${min}, updated`;

try {
    console.log('変更情報を読み込んでいます...');
    
    const fileContent = fs.readFileSync(changesFile, 'utf8').trim();
    if (!fileContent || fileContent === '[]' || fileContent === '[\n  \n]') {
        console.log('変更内容が空のため、処理を終了します。');
        process.exit(0);
    }

    const modifications = JSON.parse(fileContent);
    let code = fs.readFileSync(targetFile, 'utf8');
    let updatedCount = 0;

    // fileの指定をなくし、直接変更箇所を探す
    modifications.forEach((change, index) => {
        if (code.includes(change.search)) {
            code = code.replace(change.search, change.replace);
            updatedCount++;
        } else {
            console.warn(`警告: ${index + 1} 番目の置換対象文字列が見つかりません。`);
        }
    });

    const versionRegex = /(DuoFit v\d+\.\d+\.\d+)(?: \([^)]+\))?/;
    if (versionRegex.test(code)) {
        code = code.replace(versionRegex, `$1 (${currentDateTimeStr})`);
        console.log(`バージョン更新日時を (${currentDateTimeStr}) に自動更新しました。`);
    }

    if (updatedCount > 0) {
        fs.writeFileSync(targetFile, code, 'utf8');
        console.log(`${TARGET_FILE} のコード置換が完了しました（${updatedCount}箇所）。`);
    }

    fs.writeFileSync(changesFile, '[\n  \n]', 'utf8');
    console.log('changes.json の中身をリセットしました。');

} catch (e) {
    console.error('処理中にエラーが発生しました:', e);
}
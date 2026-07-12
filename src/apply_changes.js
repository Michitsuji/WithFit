const fs = require('fs');
const path = require('path');

const changesFile = path.join(__dirname, 'changes.json');

if (!fs.existsSync(changesFile)) {
    process.exit(0);
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
    
    // 中身が空の場合（リセット直後など）は安全に終了する
    const fileContent = fs.readFileSync(changesFile, 'utf8').trim();
    if (!fileContent || fileContent === '[]' || fileContent === '[\n  \n]') {
        console.log('変更内容が空のため、処理を終了します。');
        process.exit(0);
    }

    const modifications = JSON.parse(fileContent);
    
    modifications.forEach(mod => {
        const targetFile = path.join(__dirname, mod.file);
        if (!fs.existsSync(targetFile)) {
            console.error(`エラー: ${mod.file} が見つかりません。`);
            return;
        }

        let code = fs.readFileSync(targetFile, 'utf8');
        let updatedCount = 0;

        mod.changes.forEach((change, index) => {
            if (code.includes(change.search)) {
                code = code.replace(change.search, change.replace);
                updatedCount++;
            } else {
                console.warn(`警告: ${mod.file} の ${index + 1} 番目の置換対象文字列が見つかりません。`);
            }
        });

        // バージョン更新日時の自動書き換え
        const versionRegex = /(DuoFit v\d+\.\d+\.\d+)(?: \([^)]+\))?/;
        if (versionRegex.test(code)) {
            code = code.replace(versionRegex, `$1 (${currentDateTimeStr})`);
            console.log(`バージョン更新日時を (${currentDateTimeStr}) に自動更新しました。`);
        }

        if (updatedCount > 0) {
            fs.writeFileSync(targetFile, code, 'utf8');
            console.log(`${mod.file} のコード置換が完了しました（${updatedCount}箇所）。`);
        }
    });

    // ファイルを削除せず、中身を空の配列にリセットする
    fs.writeFileSync(changesFile, '[\n  \n]', 'utf8');
    console.log('changes.json の中身をリセットしました。');

} catch (e) {
    console.error('処理中にエラーが発生しました:', e);
}
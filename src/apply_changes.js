const fs = require('fs');
const path = require('path');

const changesFile = path.join(__dirname, 'changes.json');

if (!fs.existsSync(changesFile)) {
    process.exit(0);
}

// ご指定のフォーマット（YYYY.M.D, HH:mm, updated）に合わせて日時を生成
const now = new Date();
const yyyy = now.getFullYear();
const m = now.getMonth() + 1;
const d = now.getDate();
const hh = String(now.getHours()).padStart(2, '0');
const min = String(now.getMinutes()).padStart(2, '0');
const currentDateTimeStr = `${yyyy}.${m}.${d}, ${hh}:${min}, updated`;

try {
    console.log('変更情報を読み込んでいます...');
    const modifications = JSON.parse(fs.readFileSync(changesFile, 'utf8'));
    
    modifications.forEach(mod => {
        // apply_changes.jsがsrc内にあるため、App.jsは同じ階層として処理
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

    fs.unlinkSync(changesFile);
    console.log('changes.json を削除しました。');

} catch (e) {
    console.error('処理中にエラーが発生しました:', e);
}
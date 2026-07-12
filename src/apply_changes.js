const fs = require('fs');
const path = require('path');

const changesFile = path.join(__dirname, 'changes.json');

// changes.jsonがなければ何もせずに終了
if (!fs.existsSync(changesFile)) {
    process.exit(0);
}

try {
    console.log('変更情報を読み込んでいます...');
    const modifications = JSON.parse(fs.readFileSync(changesFile, 'utf8'));
    
    modifications.forEach(mod => {
        const targetFile = path.join(__dirname, mod.file);
        if (!fs.existsSync(targetFile)) {
            console.error(`エラー: ${mod.file} が見つかりません。`);
            return;
        }

        let code = fs.readFileSync(targetFile, 'utf8');
        let updatedCount = 0;

        mod.changes.forEach((change, index) => {
            // 完全一致で置換を実行
            if (code.includes(change.search)) {
                code = code.replace(change.search, change.replace);
                updatedCount++;
            } else {
                console.warn(`警告: ${mod.file} の ${index + 1} 番目の置換対象文字列が見つかりません。`);
            }
        });

        if (updatedCount > 0) {
            fs.writeFileSync(targetFile, code, 'utf8');
            console.log(`${mod.file} のコード置換が完了しました（${updatedCount}箇所）。`);
        }
    });

    // 適用が完了したら変更ファイルを削除
    fs.unlinkSync(changesFile);
    console.log('changes.json を削除しました。');

} catch (e) {
    console.error('処理中にエラーが発生しました:', e);
}
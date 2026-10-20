const fs = require('fs');
const path = require('path');

// ==========================================
// 【設定】分割後の全ソースファイルを自動検索して変更を適用します
// ==========================================
const TARGET_FILES = [
  'App.js',
  'firebase.js',
  'utils.js',
  'CommonUI.js',
  'WorkoutCard.js',
  'WorkoutForm.js',
  'DataView.js',
  'RecordView.js',
  'ExercisesView.js',
  'FriendsView.js',
  'ProfileModals.js',
  'CoachAndGame.js'
];

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
    
    const fileContent = fs.readFileSync(changesFile, 'utf8').trim();
    if (!fileContent || fileContent === '[]' || fileContent === '[\n  \n]') {
        console.log('変更内容が空のため、処理を終了します。');
        process.exit(0);
    }

    const modifications = JSON.parse(fileContent);
    const fileContents = {};
    const dirtyFiles = new Set();

    TARGET_FILES.forEach((fname) => {
        const fpath = path.join(__dirname, fname);
        if (fs.existsSync(fpath)) {
            fileContents[fname] = fs.readFileSync(fpath, 'utf8');
        }
    });

    let updatedCount = 0;

    modifications.forEach((change, index) => {
        let matchedFile = null;
        if (change.file && fileContents[change.file] && fileContents[change.file].includes(change.search)) {
            matchedFile = change.file;
        } else {
            for (const fname of Object.keys(fileContents)) {
                if (fileContents[fname].includes(change.search)) {
                    matchedFile = fname;
                    break;
                }
            }
        }

        if (matchedFile) {
            fileContents[matchedFile] = fileContents[matchedFile].replace(change.search, change.replace);
            dirtyFiles.add(matchedFile);
            updatedCount++;
            console.log(`[${matchedFile}] ${index + 1} 番目の変更を適用しました。`);
        } else {
            console.warn(`警告: ${index + 1} 番目の置換対象文字列がいずれのファイルにも見つかりません。`);
        }
    });

    const versionRegex = /(WithFit v\d+\.\d+\.\d+)(?: \([^)]+\))?/;
    for (const fname of Object.keys(fileContents)) {
        if (versionRegex.test(fileContents[fname])) {
            fileContents[fname] = fileContents[fname].replace(versionRegex, `$1 (${currentDateTimeStr})`);
            dirtyFiles.add(fname);
            console.log(`[${fname}] バージョン更新日時を (${currentDateTimeStr}) に自動更新しました。`);
        }
    }

    if (updatedCount > 0) {
        dirtyFiles.forEach((fname) => {
            fs.writeFileSync(path.join(__dirname, fname), fileContents[fname], 'utf8');
        });
        console.log(`コード置換が完了しました（計${updatedCount}箇所 / 更新ファイル: ${[...dirtyFiles].join(', ')}）。`);
    }

    fs.writeFileSync(changesFile, '', 'utf8');
    console.log('changes.json の中身をリセットしました。');

} catch (e) {
    console.error('処理中にエラーが発生しました:', e);
}

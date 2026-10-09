import React from 'react';

export function AdBanner() {
  return (
    <div className="w-full flex flex-col items-center justify-center mb-4 overflow-hidden">
      <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mb-1">スポンサー</span>
      <div className="flex justify-center items-center min-h-[50px] w-full max-w-[320px]">
        <a href="https://hb.afl.rakuten.co.jp/hsc/5629539f.0c9e8d7b.562953a0.7017e1e0/?link_type=pict&ut=eyJwYWdlIjoic2hvcCIsInR5cGUiOiJwaWN0IiwiY29sIjoxLCJjYXQiOiI5NSIsImJhbiI6MjA1MTk0MiwiYW1wIjpmYWxzZX0%3D" target="_blank" rel="nofollow sponsored noopener" style={{ wordWrap: 'break-word' }}>
          <img src="https://hbb.afl.rakuten.co.jp/hsb/5629539f.0c9e8d7b.562953a0.7017e1e0/?me_id=1&me_adv_id=2051942&t=pict" border="0" style={{ margin: '2px' }} alt="" title="" />
        </a>
      </div>
    </div>
  );
}

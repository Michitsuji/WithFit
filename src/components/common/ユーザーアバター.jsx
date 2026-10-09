import React from 'react';
import { generateColor } from '../../utils/便利関数';

export const UserAvatar = ({ userId, accountsInfo, size = 40, className = "", onClick = null, photoUrlOverride = undefined, displayNameOverride = undefined, colorOverride = undefined }) => {
  const userInfo = accountsInfo ? accountsInfo[userId] : null;
  const photoUrl = photoUrlOverride !== undefined && photoUrlOverride !== null ? photoUrlOverride : userInfo?.photoUrl;
  const displayName = displayNameOverride !== undefined && displayNameOverride !== null ? displayNameOverride : (userInfo?.displayName || userId || '?');
  const userColor = colorOverride !== undefined && colorOverride !== null ? colorOverride : (userInfo?.userColor || (userId ? generateColor(userId) : '#10b981'));
  const initial = displayName ? displayName.charAt(0).toUpperCase() : '?';

  const handleAvatarClick = (e) => {
    if (onClick) {
      e.stopPropagation();
      e.preventDefault();
      onClick(userId);
    }
  };

  return (
    <div 
      className={`rounded-full flex items-center justify-center font-bold text-white shrink-0 overflow-hidden shadow-sm ${onClick ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''} ${className}`}
      style={{ 
        width: size, 
        height: size, 
        backgroundColor: userColor, 
        border: size > 24 ? `2px solid ${userColor}` : `1px solid ${userColor}`,
        fontSize: Math.max(10, size * 0.4)
      }}
      onClick={handleAvatarClick}
    >
      {photoUrl ? (
        <img src={photoUrl} alt={displayName} className="w-full h-full object-cover bg-white" />
      ) : (
        initial
      )}
    </div>
  );
};

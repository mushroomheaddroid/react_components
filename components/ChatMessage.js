import React from 'react';

export default function ChatMessage(props) {
  const { ownerId, currentUserId, message, time, avatar: Avatar } = props;

  return (
    <div className={`chat__message chat__message--${ownerId === currentUserId ? 'owner' : 'opponent'}`}>
      <div className={'chat__message-text'}>{message}</div>
      <div className={'chat__message-img'}>
        <Avatar />
      </div>
      <div className={'chat__message-time'}>{time}</div>
    </div>
  );
}

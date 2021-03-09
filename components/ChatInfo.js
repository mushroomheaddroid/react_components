import React from 'react';

//components
import ChatStatuses from '../components/ChatStatuses';

export default function ChatInfo({ chatData, isStudent }) {
  return (
    <section className={'settings-info'}>
      <div className="settings-info__title-flex">
        {isStudent && (
          <div>
            <span className="settings-info__subtitle">{`Урок: ${chatData.lessonTitle}`}</span>
            <div className="settings-info__head editable">
              <div className="settings-info__title">{`Задание: ${chatData.taskTitle}`}</div>
              {chatData.taskStatusId > 1 && (
                <ChatStatuses style={chatData.taskStatusStyle} status={chatData.taskStatus} />
              )}
            </div>
          </div>
        )}
        {!isStudent && (
          <div className="settings-info__head editable">
            <div className="settings-info__title">{chatData.studentName}</div>
            {chatData.taskStatusId > 1 && (
              <ChatStatuses style={chatData.taskStatusStyle} status={chatData.taskStatus} />
            )}
          </div>
        )}
      </div>
    </section>
  );
}

import React, { useState, useEffect, useRef } from 'react';
import { Link, withRouter } from 'react-router-dom';

//components
import ChatMessage from '../components/ChatMessage';
import ChatInfo from '../components/ChatInfo';
import Button from '../components/Button';
import NewTextarea from '../components/Textarea_new';
import Avatar from '../assets/images/icons/user-icon.svg';

//utils
import { API } from '../api/API';
import { postData } from '../utils/sendData';
import { convertDate, convertTime } from '../utils/converters';

//icons
import LeftArrowIcon from '../assets/images/icons/16/chevron-left.svg';
import IconWarn from '../assets/images/icons/24/warning.svg';

//styles
import '../scss/chat.scss';

function TaskCheckChat(props) {
  const { match } = props;
  const {
    params: { taskResultId, id: courseId, userType },
  } = match;

  const [messageArea, setMessageArea] = useState('');
  const [chatData, setChatData] = useState({
    studentId: 0,
    studentName: '',
    taskStatusId: 0,
    taskStatus: '',
    taskStatusStyle: '',
    taskTitle: '',
    lessonTitle: '',
  });
  const [currentUser, setCurrentUser] = useState({
    id: 0,
    isStudent: false,
  });
  const [chatMessages, setChatMessages] = useState([]);

  //Функии для подготовки данных

  const prepareTaskStatusStyle = (id) => {
    switch (id) {
      case 4:
        return 'decline';
      case 3:
        return 'accept';
      case 2:
        return 'toWork';
      default:
        break;
    }
  };

  const prepareTimeView = (timeStamp) => {
    const date = convertDate(timeStamp, 'view').replace(/\./g, '/');
    const time = convertTime(timeStamp, 'view');

    return `${date} ${time}`;
  };

  const prepareCurrentUserData = (userParams) => {
    const {
      data: {
        data: {
          attributes: { user_id: id },
        },
      },
    } = userParams;

    return {
      id,
    };
  };

  const prepareChatData = (taskResultsParams) => {
    const {
      data: {
        data: {
          attributes: {
            user_id: studentId,
            username: studentName,
            friendly_status: taskStatus,
            status: taskStatusId,
            lesson: {
              attributes: { title: lessonTitle },
            },
            task: {
              attributes: { title: taskTitle },
            },
          },
        },
      },
    } = taskResultsParams;

    return {
      studentId,
      studentName: studentName === ' ' ? 'Уважаемый пользователь' : studentName,
      taskStatus,
      taskStatusId,
      taskStatusStyle: prepareTaskStatusStyle(taskStatusId),
      lessonTitle,
      taskTitle,
    };
  };

  const prepareChatMessages = (messagesParams) => {
    const {
      data: { data },
    } = messagesParams;

    return data.map((item) => {
      const {
        id: messageId,
        attributes: { content: message, 'created-at': time, user_id: ownerId },
      } = item;

      return {
        messageId,
        message,
        time: prepareTimeView(time),
        ISOTime: time,
        ownerId,
      };
    });
  };

  const prepareMessage = (message) => {
    return {
      data: {
        type: 'messages',
        attributes: {
          content: message,
        },
        relationships: {
          'task-result': {
            data: {
              type: 'task-results',
              id: taskResultId,
            },
          },
        },
      },
    };
  };

  const getLastMessageTime = (messages) => {
    return messages[messages.length - 1].ISOTime;
  };

  const prepareTimeData = (timeStamp) => {
    return { last_message_created: timeStamp };
  };

  //Скролл вниз к новому сообщению
  const messagesEndRef = useRef(null);
  const scrollToBottom = () => {
    messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
  };

  //Подгрузка новых сообщений от собеседника
  async function longPoller(timeData) {
    let response = await postData(timeData, API.pollMessages.path(taskResultId, userType), API.pollMessages.method);

    if (response.status == 502) {
      //сервер закрыл связь
      await longPoller(timeData);
    } else if (response.status != 200 || response.data.data.length === 0) {
      //сервер вернул запрос или запрос окончился ошибкой
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await longPoller(timeData);
    } else {
      //сообщение получено
      let message = await response;

      const newMessages = prepareChatMessages(message);
      const newTimedata = prepareTimeData(getLastMessageTime(newMessages));
      setChatMessages((prev) => [...prev, ...newMessages]);
      await longPoller(newTimedata);
    }
  }

  //Первоначальная загрузка данных
  useEffect(() => {
    const isStudent = userType !== 'admin' ? true : false;

    Promise.all([
      postData(null, API.getUserData.path, API.getUserData.method),
      postData(null, API.getTask.path(taskResultId, userType), API.getTask.method),
      postData(null, API.getMessagesList.path(taskResultId, userType), API.getMessagesList.method),
    ]).then(([userParams, taskResultsParams, messagesParams]) => {
      const currentUser = prepareCurrentUserData(userParams);
      const chatData = prepareChatData(taskResultsParams);
      const chatMessages = prepareChatMessages(messagesParams);

      setCurrentUser((prev) => ({ ...currentUser, isStudent }));
      setChatData((prev) => chatData);
      setChatMessages((prev) => chatMessages);
    });
  }, []);

  useEffect(scrollToBottom, [chatMessages]);

  useEffect(() => {
    let timeData;
    if (chatMessages.length === 0) {
      timeData = prepareTimeData(new Date().toISOString());
      longPoller(timeData);
    } else {
      lastMessageTime = getLastMessageTime(chatMessages);
      timeData = prepareTimeData(lastMessageTime);
      longPoller(timeData);
    }
  }, []);

  //Публикация сообщения
  const handleSendMessage = (msg) => {
    if (typeof msg !== 'string' || msg.trim() === '' || msg.length < 1) {
      return null;
    }

    const message = prepareMessage(msg);

    postData(message, API.sendMessage.path(userType), API.sendMessage.method).catch((err) => new Error(err));
  };

  //Обработка действия при нажатии Enter
  const handleKeyPress = (e) => {
    if (e.key == 'Enter') {
      e.preventDefault();
      handleSendMessage(messageArea);
      setMessageArea((prev) => '');
    }
  };

  const renderedMessages = chatMessages
    .sort((a, b) => {
      return Date.parse(a.time) - Date.parse(b.time);
    })
    .map((item, i) => {
      return (
        <ChatMessage
          key={i}
          ownerId={item.ownerId}
          currentUserId={currentUser.id}
          message={item.message}
          time={item.time}
          avatar={Avatar}
        />
      );
    });

  //Назначение статусов для задания
  const handleDecline = () => {
    postData({}, API.declineTask.path(taskResultId), API.declineTask.method).then((taskResultsParams) => {
      const chatData = prepareChatData(taskResultsParams);
      setChatData((prev) => chatData);
    });
  };

  const handleAccept = () => {
    postData({}, API.acceptTask.path(taskResultId), API.acceptTask.method).then((taskResultsParams) => {
      const chatData = prepareChatData(taskResultsParams);
      setChatData((prev) => chatData);
    });
  };

  const handleRework = () => {
    postData({}, API.reworkTask.path(taskResultId), API.reworkTask.method).then((taskResultsParams) => {
      const chatData = prepareChatData(taskResultsParams);
      setChatData((prev) => chatData);
    });
  };

  return (
    <main className={'settings'}>
      <div className={'settings-container'}>
        <section className={'settings-header'}>
          <Link to={`/admin/courses/${courseId}/tasks/`}>
            <Button className={'btn btn-settings-header-sec'} value={'Назад'} icon={<LeftArrowIcon />} />
          </Link>
        </section>
        <ChatInfo chatData={chatData} isStudent={currentUser.isStudent} />
        <section className={'chat'}>
          <div className={'chat__container'}>
            {renderedMessages}
            <div ref={messagesEndRef} />
          </div>
          <div className={'chat__control'}>
            {chatData.taskStatusId <= 2 ? (
              <>
                {!currentUser.isStudent && (
                  <div className={'chat__control-buttons'}>
                    <Button
                      onClick={() => handleDecline()}
                      className={'chat__control-button chat__control-button--decline'}
                      value={'отклонить'}
                    />
                    <Button
                      onClick={() => handleRework()}
                      className={'chat__control-button chat__control-button--toWork'}
                      value={'доработать'}
                    />
                    <Button
                      onClick={() => handleAccept()}
                      className={`chat__control-button chat__control-button--accept`}
                      value={'принять'}
                    />
                  </div>
                )}
                <div className={'chat__control-textarea cp-input cp-input_size_variable'}>
                  <NewTextarea
                    name="chat"
                    value={messageArea}
                    onChange={(value) => setMessageArea((prev) => value)}
                    onKeyPress={handleKeyPress}
                  />
                </div>
                <Button
                  value={'Отправить'}
                  className={'chat__control-send cp-btn cp-btn_size_medium cp-scheme_primary-default'}
                  onClick={() => handleSendMessage(messageArea)}
                />
              </>
            ) : (
              <div className={'chat__blocked'}>
                <IconWarn /> Оценка заданию поставлена, комментарии недоступны
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

export default withRouter(TaskCheckChat);

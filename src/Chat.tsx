import React, { FC, useEffect, useRef, useState } from 'react';
// import {
//   TextField,
//   List,
//   ListItem,
//   ListItemText,
//   InputAdornment,
//   IconButton,
//   LinearProgress,
// } from '@mui/material';
// import SendIcon from '@mui/icons-material/Send';
import { Message } from './types';
import { IconButton, Input } from '@momentum-xyz/ui-kit';
import * as styled from './Chat.styled';

interface ChatHistoryProps {
  messages: Message[];
}

const contentToText = (content: string) => {
  try {
    console.log('contentToText:', content);
    const parsed = JSON.parse(content);
    if (typeof parsed === 'string') {
      return parsed;
    }
    if (Array.isArray(parsed)) {
      return parsed
        .filter((it) => it.type === 'text')
        .map((it) => it.text)
        .join('\n');
    }
    if (typeof parsed === 'object' && parsed.text) {
      return parsed.text;
    }
  } catch (err) {
    // console.log('contentToText err', err);
  }
  return content;
};

export const ChatHistory: FC<ChatHistoryProps> = ({ messages }) => {
  const refLast = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (refLast.current) {
      refLast.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  return (
    <styled.MessagesHistory>
      {messages.map((msg, index) => {
        const isUser = msg.role === 'user';
        const text = contentToText(msg.content);

        return (
          <div
            key={index}
            style={{
              display: 'flex',
              justifyContent: isUser ? 'flex-end' : 'flex-start',
            }}
          >
            <styled.Message
              style={{
                background: isUser ? '#e0f7fa' : '#ffecb3',
                color: '#777',
                padding: '8px 16px',
                borderRadius: '16px',
                maxWidth: '70%',
                display: 'inline-block',
                // preserve newline
                whiteSpace: 'pre-wrap',
              }}
            >
              {text}
            </styled.Message>
          </div>
        );
      })}
      <span ref={refLast} />
    </styled.MessagesHistory>
  );
};

export interface ChatInputProps {
  onSend: (message: string) => Promise<void>;
}

export const ChatInput = ({ onSend }: ChatInputProps) => {
  const [message, setMessage] = useState<string>('');

  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleSubmit = async (e?: React.FormEvent) => {
    console.log('handleSubmit', message);
    if (isLoading) {
      console.log('handleSubmit isLoading - ignore');
      return;
    }
    e?.preventDefault();

    const trimmedMsg = message.trim();

    if (trimmedMsg) {
      try {
        setIsLoading(true);
        await onSend(trimmedMsg);
        setMessage('');
      } finally {
        setIsLoading(false);
      }
    }
  };
  return (
    <div className="chat-input-panel">
      <Input
        wide
        value={message}
        // disabled={isLoading} leads to losing focus after sending a message
        onChange={(value) => setMessage(value)}
        placeholder="Type your message"
        onEnter={handleSubmit}
        actionRight={<IconButton isWhite name="send" onClick={handleSubmit} />}
      />
      {/* {isLoading && <LinearProgress sx={{ margin: '1em 0' }} />} */}
    </div>
  );
};

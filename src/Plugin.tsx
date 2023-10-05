import { useState, useEffect } from 'react';
import { UsePluginHookType, useSharedObjectState } from '@momentum-xyz/sdk';
// import { Input } from '@momentum-xyz/ui-kit';
// import { useI18n } from '@momentum-xyz/core';
import { useLocalStorage } from './useLocalStorage';

import '@momentum-xyz/ui-kit/dist/themes/themes';
import { ChatHistory, ChatInput } from './Chat';
import * as styled from './Chat.styled';
import { Message } from './types';
import { initClient, sendToOpenAI } from './open-ai';
import { Button } from '@momentum-xyz/ui-kit';

const usePlugin: UsePluginHookType = (props) => {
  const [messages, setMessages] = useState<Message[]>([]);

  const [storedOpenAIApiKey, setStoredOpenAIApiKey] = useLocalStorage(
    '__plugin_d7bda9fc-c632-4650-8e0c-583c83e5c515_temp_data__',
    null
  );
  useEffect(() => {
    console.log('storedOpenAIApiKey', storedOpenAIApiKey);
    if (storedOpenAIApiKey) {
      initClient(storedOpenAIApiKey);
    }
  }, [storedOpenAIApiKey, setStoredOpenAIApiKey]);

  const handleSend = async (message: string) => {
    setMessages((messages) => [
      ...messages,
      { content: message, role: 'user' },
    ]);
    console.log('onSend', message);
    // const response = 'hey hoe';
    const response = await sendToOpenAI(message, {}, {}, {}, []);
    setMessages((messages) => [
      ...messages,
      { content: response, role: 'assistant' },
    ]);
  };

  let content = (
    <styled.Container>
      <ChatHistory messages={messages} />
      <ChatInput onSend={handleSend} />
    </styled.Container>
  );

  if (!storedOpenAIApiKey) {
    content = (
      <styled.Container>
        <p>
          You need to get an API key from{' '}
          <a href="https://platform.openai.com/">OpenAI Platform</a> and paste
          it here:
        </p>
        <Button
          label="Enter API key"
          onClick={() => {
            const key = prompt('Please enter your OpenAI API key');
            if (key) {
              setStoredOpenAIApiKey(key);
            }
          }}
        />
      </styled.Container>
    );
  }

  // useEffect(() => {
  //   setInterval(() => {
  //     setState((state) => state + 1);
  //   }, 1000);
  // }, []);

  return {
    creatorTab: {
      title: 'OpenAI',
      icon: 'ai',
      content,
      onOpen: () => {
        console.log('[plugin_creator]: OpenAI tab opened');
      },
      onClose: () => {
        console.log('[plugin_creator]: OpenAI tab closed');
      },
    },
  };
};

const Plugin = {
  usePlugin,
};

export default Plugin;

import { useState, useEffect } from 'react';
import {
  Asset3d,
  ObjectData,
  ObjectDefinition,
  TransformNoScale,
  UsePluginHookType,
  UseWorldReturnInterface,
  useSharedObjectState,
  useWorld,
} from '@momentum-xyz/sdk';
// import { Input } from '@momentum-xyz/ui-kit';
// import { useI18n } from '@momentum-xyz/core';
import { useLocalStorage } from './useLocalStorage';

import '@momentum-xyz/ui-kit/dist/themes/themes';
import { ChatHistory, ChatInput } from './Chat';
import * as styled from './Chat.styled';
import { Message } from './types';
import { initClient, sendToOpenAI } from './open-ai';
import { Button } from '@momentum-xyz/ui-kit';
import { meshyGenerate3D } from './meshy-ai';

let worldId: string;
const objects: Record<string, ObjectDefinition> = {};
const objectsData: Record<string, ObjectData> = {};
let myTransform: TransformNoScale = {
  position: { x: 0, y: 0, z: 0 },
  rotation: { x: 0, y: 0, z: 0 },
};

const asset3dNamesById: Record<string, string> = {};
let supportedAssets: { asset3dId: string; name: string; category: string }[] =
  [];

const defaultTransform = {
  position: { x: 0, y: 0, z: 0 },
  rotation: { x: 0, y: 0, z: 0 },
  scale: { x: 1, y: 1, z: 1 },
};

const usePlugin: UsePluginHookType = (props) => {
  console.log('[plugin_creator]: usePlugin', props);
  const [messages, setMessages] = useState<Message[]>([]);

  const worldApi = useWorld({
    onJoinedWorld: (worldInfo) => {
      console.log('[plugin_creator]: onJoinedWorld', worldInfo);
      worldId = worldInfo.id;
    },
    onLeftWorld: () => {
      console.log('[plugin_creator]: onLeftWorld');
      worldId = '';
    },
    onMyPosition(transform) {
      console.log('[plugin_creator]: onMyPosition', transform);
      myTransform = transform;
    },
    onObjectAdded: (object) => {
      console.log('[plugin_creator]: onObjectAdded', object);
      if (object.id !== worldId) {
        objects[object.id] = object;
      }
    },
    onObjectRemoved: (objectId) => {
      console.log('[plugin_creator]: onObjectRemoved', objectId);
      delete objects[objectId];
    },
    onObjectMove(objectId, transform) {
      console.log('[plugin_creator]: onObjectMove', objectId, transform);
      objects[objectId] = {
        ...objects[objectId],
        transform,
      };
    },
    onObjectData(objectId, data) {
      console.log('[plugin_creator]: onObjectData', objectId, data);
      objectsData[objectId] = data;
    },
  });

  const { getSupportedAssets3d } = worldApi;

  useEffect(() => {
    Promise.all([
      getSupportedAssets3d('basic'),
      getSupportedAssets3d('custom'),
    ]).then((res) => {
      console.log('[plugin_creator]: assets3d resp', res);
      const assets3d = res.flat();
      console.log('[plugin_creator]: assets3d', assets3d);

      supportedAssets = assets3d.map(({ id, meta: { name, category } }) => ({
        asset3dId: id,
        name,
        category,
      }));
      console.log('Supported assets', supportedAssets);

      for (const asset of supportedAssets) {
        asset3dNamesById[asset.asset3dId] = asset.name;
      }
    });
  }, [getSupportedAssets3d]);

  /*
  const {
    addObject,
    removeObject,
    moveUser,
    transformObject,
    requestObjectLock, // ??
  } = useWorld({
    onJoin: (worldInfo) => {
      console.log('[plugin_creator]: onJoin', worldInfo);
    },
    onLeave : () => {
      console.log('[plugin_creator]: onLeave');
    },
    onObjectAdded: (object) => {
      console.log('[plugin_creator]: onObjectAdded', object);
    }
  })
*/
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

  const [storedMeshyApiKey, setStoredMeshyApiKey] = useLocalStorage(
    '__plugin_d7bda9fc-c632-4650-8e0c-583c83e5c515_temp_data_msh__',
    null
  );

  const handleSend = async (message: string) => {
    console.log('handleSend', message);
    setMessages((messages) => [
      ...messages,
      { content: message, role: 'user' },
    ]);

    try {
      if (message.slice(0, 10).toLowerCase().startsWith('/meshy:')) {
        let meshyApiKey = storedMeshyApiKey;
        if (!storedMeshyApiKey) {
          const key = prompt('Please enter your Meshy API key');
          if (key) {
            setStoredMeshyApiKey(key);
          }
          meshyApiKey = key;
        }

        if (!meshyApiKey) {
          throw new Error('No Meshy API key provided');
        }

        const { downloadUrl, thumbnailUrl } = await meshyGenerate3D(
          {
            object_prompt: message.slice(7),
            art_style: 'realistic',
          },
          meshyApiKey,
          (progress) => {
            console.log('Meshy progress', progress);
          }
        );

        setMessages((messages) => [
          ...messages,
          {
            content: JSON.stringify({
              downloadUrl,
              thumbnailUrl,
            }),
            role: 'model_preview',
          },
        ]);

        return;
      }

      // OpenAI
      const response = await sendToOpenAI(
        message,
        objects,
        objectsData,
        myTransform,
        supportedAssets
      );

      console.log('processResponse from OpenAI:', response);
      const result = await processResponse(response, worldApi);

      setMessages((messages) => [
        ...messages,
        { content: result, role: 'assistant' },
      ]);
    } catch (err: any) {
      console.error('Something went wrong', err);
      setMessages((messages) => [
        ...messages,
        { content: 'Something went wrong. ' + err.message, role: 'assistant' },
      ]);
    }
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

const processResponse = async (
  response: string,
  worldApi: UseWorldReturnInterface
) => {
  let actions: any[] = JSON.parse(response);

  const {
    spawnObject,
    transformObject,
    removeObject,
    requestObjectLock,
    requestObjectUnlock,
    setObjectColor,
    setObjectName,
  } = worldApi;

  const responses: string[] = [];

  for (const action of actions) {
    switch (action.type) {
      case 'text':
        console.log('Text response', action);
        responses.push(action.text);
        break;

      case 'new':
        console.log('New object', action);
        const { name, color, asset3dId, transform } = action;

        if (!asset3dNamesById[asset3dId]) {
          console.error('Unknown asset3dId', asset3dId);
          break;
        }
        const object = await spawnObject({
          name,
          transform: { ...defaultTransform, ...transform },
          asset_3d_id: asset3dId,
        });
        console.log('Spawned object', object);
        if (color) {
          await setObjectColor(object.id, color);
        }
        break;

      case 'edit':
        console.log('Edit object', action);
        if (action.color) {
          await setObjectColor(action.objectId, action.color);
        }
        if (action.name) {
          await setObjectName(action.objectId, action.name);
        }
        break;

      case 'remove':
        console.log('Remove object', action);
        removeObject(action.objectId);
        break;

      case 'transform':
        console.log('Transform object', action);
        await requestObjectLock(action.objectId);
        const newTransform = {
          ...objects[action.objectId].transform,
          ...action.transform,
        };
        transformObject(action.objectId, newTransform);
        requestObjectUnlock(action.objectId);
        break;

      default:
        console.log('Unknown action', action);
    }
  }
  return responses.join('\n') || 'Done';
};

const Plugin = {
  usePlugin,
};

export default Plugin;

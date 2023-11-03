export const meshyGenerate3D = async (
  data: {
    object_prompt: string;
    art_style: string;
    style_prompt?: string;
    enable_pbr?: boolean; // default: true
    negative_prompt?: string;
  },
  apiKey: string,
  onUploadProgress?: (progressEvent: any) => void
) => {
  const { result } = await fetch('https://api.meshy.ai/v1/text-to-3d', {
    method: 'POST',
    body: JSON.stringify(data),
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
  }).then((res) => res.json());

  if (!result) throw new Error('No result returned from Meshy AI');

  for (let i = 0; i < 100; i++) {
    const resp = await fetch(`https://api.meshy.ai/v1/text-to-3d/${result}`, {
      method: 'GET',
      mode: 'no-cors',
      credentials: 'include',
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    }).then((res) => res.json());

    const {
      status,
      progress,
      model_url,
      model_urls,
      thumbnail_url,
      task_error,
    } = resp;

    if (status === 'IN_PROGRESS') {
      onUploadProgress?.({ loaded: progress, total: 100 });
    } else if (status === 'FAILED') {
      throw new Error(
        'Meshy AI failed to generate 3D model: ' +
          (task_error?.message || 'Unknown error')
      );
    } else if (status === 'EXPIRED') {
      throw new Error('Meshy AI task expired');
    } else if (status === 'SUCCEEDED') {
      return {
        downloadUrl: model_urls?.glb || model_url,
        thumbnailUrl: thumbnail_url,
      };
    }

    await new Promise((resolve) => setTimeout(resolve, 5000));
  }

  throw new Error('Meshy AI task timed out');
};

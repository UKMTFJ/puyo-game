import { google } from 'googleapis';
import { Readable } from 'stream';

const SCOPES = ['https://www.googleapis.com/auth/drive.file'];

const getDriveClient = () => {
  const auth = new google.auth.GoogleAuth({
    credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON || '{}'),
    scopes: SCOPES,
  });
  return google.drive({ version: 'v3', auth });
};

export async function createFolderIfNotExists(folderName: string, parentId?: string): Promise<string> {
  const drive = getDriveClient();
  const q = `name = '${folderName.replace(/'/g, "\\'")}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false${parentId ? ` and '${parentId}' in parents` : ''}`;
  const response = await drive.files.list({ q, fields: 'files(id, name)' });

  if (response.data.files?.length) return response.data.files[0].id!;

  const folder = await drive.files.create({
    requestBody: { name: folderName, mimeType: 'application/vnd.google-apps.folder', parents: parentId ? [parentId] : [] },
    fields: 'id',
  });
  return folder.data.id!;
}

export async function uploadToDrive(fileName: string, content: string | Buffer, mimeType: string, parentFolderId: string) {
  const drive = getDriveClient();
  const file = await drive.files.create({
    requestBody: { name: fileName, parents: [parentFolderId] },
    media: { mimeType, body: typeof content === 'string' ? Readable.from([content]) : Readable.from(content) },
    fields: 'id, webViewLink',
  });
  return file.data;
}

export interface SavePostsParams {
  storeName: string;
  topic1: string;
  post1Text: string;
  post1Image1: string;
  post1Image2: string;
  topic2: string;
  post2Text: string;
  post2Image1: string;
  post2Image2: string;
  imageStyle: string;
  snsUrls: Record<string, string>;
}

function dataUrlToBuffer(dataUrl: string): { buffer: Buffer; mimeType: string } {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) throw new Error('Invalid data URL');
  return { buffer: Buffer.from(match[2], 'base64'), mimeType: match[1] };
}

function imageExt(mimeType: string): string {
  if (mimeType.includes('jpeg') || mimeType.includes('jpg')) return 'jpg';
  if (mimeType.includes('webp')) return 'webp';
  return 'png';
}

export async function saveAllToDrive(params: SavePostsParams): Promise<{ folderId: string; folderName: string }> {
  const rootId = await createFolderIfNotExists('GBP_Automation_Outputs');
  const storeId = await createFolderIfNotExists(params.storeName, rootId);

  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const folderName = `${date}_${params.topic1.slice(0, 15)}`;
  const postFolderId = await createFolderIfNotExists(folderName, storeId);

  const now = new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });

  const reviewChecklist = `生成日時: ${now}
店舗名: ${params.storeName}

【投稿1】
トピック: ${params.topic1}
テキスト:
${params.post1Text}
画像: post1_image1, post1_image2

【投稿2】
トピック: ${params.topic2}
テキスト:
${params.post2Text}
画像: post2_image1, post2_image2

■ 投稿前チェックリスト
□ テキストに誤字・不自然な表現がない
□ 電話番号・個人情報が含まれていない
□ 画像にロゴ・人物の顔が含まれていない
□ 過去投稿と内容が重複していない
□ 画像と文章の内容が一致している
`;

  const metadata = JSON.stringify({
    storeName: params.storeName,
    generatedAt: now,
    topic1: params.topic1,
    topic2: params.topic2,
    imageStyle: params.imageStyle,
    snsUrls: params.snsUrls,
  }, null, 2);

  const uploads: Array<() => Promise<unknown>> = [
    () => uploadToDrive('post1_text.txt', params.post1Text, 'text/plain', postFolderId),
    () => uploadToDrive('post2_text.txt', params.post2Text, 'text/plain', postFolderId),
    () => uploadToDrive('metadata.json', metadata, 'application/json', postFolderId),
    () => uploadToDrive('review_checklist.txt', reviewChecklist, 'text/plain', postFolderId),
  ];

  for (const [dataUrl, name] of [
    [params.post1Image1, 'post1_image1'],
    [params.post1Image2, 'post1_image2'],
    [params.post2Image1, 'post2_image1'],
    [params.post2Image2, 'post2_image2'],
  ] as [string, string][]) {
    if (dataUrl) {
      const { buffer, mimeType } = dataUrlToBuffer(dataUrl);
      const ext = imageExt(mimeType);
      uploads.push(() => uploadToDrive(`${name}.${ext}`, buffer, mimeType, postFolderId));
    }
  }

  await Promise.all(uploads.map(fn => fn()));

  return { folderId: postFolderId, folderName };
}

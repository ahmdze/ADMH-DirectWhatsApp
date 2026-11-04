/**
 * Native APK download + installer hand-off.
 *
 * The update checker never installs anything silently: it downloads the APK
 * inside the app with a progress bar, then asks Android's package installer to
 * show the normal "Update app" confirmation. The user still taps Install.
 */
import type { AppUpdateInfo } from './appUpdate';
import { isNative } from './native';

export interface UpdateDownloadProgress {
  bytes: number;
  total: number;
  /** 0–100, or null when the server did not send Content-Length. */
  percent: number | null;
}

export interface DownloadedUpdate {
  path: string;
  fileName: string;
}

export async function downloadAppUpdate(
  info: AppUpdateInfo,
  onProgress: (progress: UpdateDownloadProgress) => void
): Promise<DownloadedUpdate> {
  if (!isNative()) throw new Error('Downloads are only supported in the Android app.');
  if (!info.apkUrl) throw new Error('The release does not contain an APK asset.');

  const [{ Directory, Filesystem }, { FileTransfer }] = await Promise.all([
    import('@capacitor/filesystem'),
    import('@capacitor/file-transfer')
  ]);

  const fileName = `admh-update-${info.latestVersion}.apk`;
  const { uri } = await Filesystem.getUri({ directory: Directory.Cache, path: fileName });

  const listener = await FileTransfer.addListener('progress', (event) => {
    const total = Number(event.contentLength ?? 0);
    const bytes = Number(event.bytes ?? 0);
    const percent = total > 0 ? Math.min(100, Math.max(0, Math.round((bytes / total) * 100))) : null;
    onProgress({ bytes, total, percent });
  });

  try {
    await FileTransfer.downloadFile({ url: info.apkUrl, path: uri, progress: true });
  } finally {
    await listener.remove();
  }

  return { path: uri, fileName };
}

export async function installDownloadedUpdate(download: DownloadedUpdate): Promise<void> {
  if (!isNative()) throw new Error('Installation is only supported in the Android app.');
  const { FileOpener } = await import('@capawesome-team/capacitor-file-opener');
  await FileOpener.openFile({
    path: download.path,
    mimeType: 'application/vnd.android.package-archive'
  });
}

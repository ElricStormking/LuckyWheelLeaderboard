import Phaser from "phaser";

const pendingPrizeTextures = new Map<string, Promise<string>>();

export function syncPrizeArtImage(
  scene: Phaser.Scene,
  artImage: Phaser.GameObjects.Image,
  imageUrl: string | null | undefined,
  maxWidth: number,
  maxHeight: number,
) {
  if (!imageUrl) {
    artImage.setVisible(false);
    return;
  }

  ensurePrizeTexture(scene, imageUrl)
    .then((textureKey) => {
      if (!artImage.scene || artImage.scene !== scene) {
        return;
      }

      artImage.setTexture(textureKey);
      fillImageFrame(artImage, maxWidth, maxHeight);
      artImage.setVisible(true);
    })
    .catch(() => {
      artImage.setVisible(false);
    });
}

function ensurePrizeTexture(scene: Phaser.Scene, imageUrl: string) {
  const textureKey = getPrizeTextureKey(imageUrl);
  if (scene.textures.exists(textureKey)) {
    return Promise.resolve(textureKey);
  }

  const pendingTexture = pendingPrizeTextures.get(textureKey);
  if (pendingTexture) {
    return pendingTexture;
  }

  const promise = new Promise<string>((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => {
      if (!scene.textures.exists(textureKey)) {
        scene.textures.addImage(textureKey, image);
      }

      pendingPrizeTextures.delete(textureKey);
      resolve(textureKey);
    };
    image.onerror = () => {
      pendingPrizeTextures.delete(textureKey);
      reject(new Error(`Unable to load remote prize image: ${imageUrl}`));
    };
    image.src = imageUrl;
  });

  pendingPrizeTextures.set(textureKey, promise);
  return promise;
}

function fillImageFrame(
  image: Phaser.GameObjects.Image,
  frameWidth: number,
  frameHeight: number,
) {
  const source = image.texture.getSourceImage() as { width?: number; height?: number };
  const sourceWidth = source.width ?? frameWidth;
  const sourceHeight = source.height ?? frameHeight;
  const sourceRatio = sourceWidth / sourceHeight;
  const frameRatio = frameWidth / frameHeight;

  if (sourceRatio > frameRatio) {
    const cropWidth = sourceHeight * frameRatio;
    image.setCrop((sourceWidth - cropWidth) / 2, 0, cropWidth, sourceHeight);
  } else {
    const cropHeight = sourceWidth / frameRatio;
    image.setCrop(0, (sourceHeight - cropHeight) / 2, sourceWidth, cropHeight);
  }

  image.setDisplaySize(frameWidth, frameHeight);
}

function getPrizeTextureKey(imageUrl: string) {
  let hash = 0;
  for (let index = 0; index < imageUrl.length; index += 1) {
    hash = (hash * 31 + imageUrl.charCodeAt(index)) | 0;
  }

  return `remote-prize-${Math.abs(hash)}`;
}

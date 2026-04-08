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
      fitImageWithin(artImage, maxWidth, maxHeight);
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

function fitImageWithin(
  image: Phaser.GameObjects.Image,
  maxWidth: number,
  maxHeight: number,
) {
  const source = image.texture.getSourceImage() as { width?: number; height?: number };
  const sourceWidth = source.width ?? maxWidth;
  const sourceHeight = source.height ?? maxHeight;
  const scale = Math.min(maxWidth / sourceWidth, maxHeight / sourceHeight);

  image.setScale(scale);
}

function getPrizeTextureKey(imageUrl: string) {
  let hash = 0;
  for (let index = 0; index < imageUrl.length; index += 1) {
    hash = (hash * 31 + imageUrl.charCodeAt(index)) | 0;
  }

  return `remote-prize-${Math.abs(hash)}`;
}


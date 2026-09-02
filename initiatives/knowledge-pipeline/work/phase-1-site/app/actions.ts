'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { getChatGPTUser } from './chatgpt-auth';
import { confirmErase } from '@/lib/domain.mjs';
import {
  AccessError,
  addAuthorizedUser,
  authorizeUser,
  createCollection,
  createCurrentBackup,
  commitHarvest,
  previewErase,
  previewHarvest,
  restoreCollectionBackup,
  selectCollection,
  tombstoneAndErase,
} from '@/lib/site-repository';

async function context() {
  const user = await getChatGPTUser();
  if (!user) throw new AccessError(401, 'identity.required', 'Sign in is required');
  return authorizeUser(user);
}

function value(formData: FormData, key: string) {
  return String(formData.get(key) ?? '');
}

function failure(error: unknown): never {
  const code = error instanceof AccessError ? error.code : 'operation.failed';
  redirect(`/?notice=${encodeURIComponent(code)}`);
}

export async function createCollectionAction(formData: FormData) {
  try {
    await createCollection(await context(), value(formData, 'name'));
    revalidatePath('/');
  } catch (error) { failure(error); }
}

export async function selectCollectionAction(formData: FormData) {
  try {
    await selectCollection(await context(), value(formData, 'collectionId'));
    revalidatePath('/');
  } catch (error) { failure(error); }
}

export async function createBackupAction(formData: FormData) {
  try {
    await createCurrentBackup(await context(), value(formData, 'collectionId'));
    revalidatePath('/');
  } catch (error) { failure(error); }
}

export async function restoreBackupAction(formData: FormData) {
  try {
    await restoreCollectionBackup(await context(), value(formData, 'collectionId'), value(formData, 'backupId'));
    revalidatePath('/');
  } catch (error) { failure(error); }
}

export async function eraseCollectionAction(formData: FormData) {
  try {
    const authorized = await context();
    const collectionId = value(formData, 'collectionId');
    const preview = await previewErase(authorized, collectionId);
    const confirmed = confirmErase(preview, {
      token: value(formData, 'token'),
      collectionName: value(formData, 'collectionName'),
    });
    if (!confirmed.ok) throw new AccessError(409, confirmed.code ?? 'erase.refused', 'Erase confirmation is invalid');
    if (value(formData, 'finalExport') === 'yes') await createCurrentBackup(authorized, collectionId);
    await tombstoneAndErase(authorized, collectionId, Number(value(formData, 'collectionRevision')));
    redirect('/?notice=collection.erased');
  } catch (error) { failure(error); }
}

export async function addAuthorizedUserAction(formData: FormData) {
  try {
    const role = value(formData, 'role') === 'admin' ? 'admin' : 'user';
    await addAuthorizedUser(await context(), value(formData, 'email'), role);
    revalidatePath('/');
  } catch (error) { failure(error); }
}

export async function previewHarvestAction(formData: FormData) {
  try {
    const kind = value(formData, 'kind');
    const collectionId = value(formData, 'collectionId');
    const payload = kind === 'direct' || kind === 'browser-saved'
      ? {
          url: value(formData, 'url'),
          title: value(formData, 'title'),
          body: value(formData, 'body') || null,
          bodyForm: value(formData, 'bodyForm'),
          capturedAt: value(formData, 'capturedAt') || null,
          contributor: value(formData, 'contributor') || null,
          rightsState: value(formData, 'rightsState'),
          captureState: value(formData, 'captureState'),
          tags: value(formData, 'tags').split(',').map((item) => item.trim()).filter(Boolean),
          savedFrom: kind === 'browser-saved' ? 'browser' : null,
        }
      : JSON.parse(value(formData, 'nativePayload'));
    await previewHarvest(await context(), collectionId, kind, payload);
    revalidatePath('/');
  } catch (error) { failure(error); }
}

export async function commitHarvestAction(formData: FormData) {
  try {
    await commitHarvest(await context(), value(formData, 'collectionId'), value(formData, 'previewId'));
    revalidatePath('/');
  } catch (error) { failure(error); }
}

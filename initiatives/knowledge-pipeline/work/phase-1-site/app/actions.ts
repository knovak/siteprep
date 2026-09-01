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
  previewErase,
  restoreEmptyBackup,
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
    await restoreEmptyBackup(await context(), value(formData, 'collectionId'), value(formData, 'backupId'));
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

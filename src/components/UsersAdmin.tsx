"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { PasswordField } from "@/components/PasswordField";
import { ROLE_LABELS, type UserRole } from "@/lib/auth-types";
import type { UserAccount } from "@/lib/permissions";

type AddFormState = {
  name: string;
  username: string;
  email: string;
  role: UserRole;
  password: string;
  confirmPassword: string;
};

type EditFormState = {
  name: string;
  username: string;
  role: UserRole;
  isActive: boolean;
  password: string;
  confirmPassword: string;
};

const EMPTY_ADD_FORM: AddFormState = {
  name: "",
  username: "",
  email: "",
  role: "technician",
  password: "",
  confirmPassword: "",
};

const EMPTY_EDIT_FORM: EditFormState = {
  name: "",
  username: "",
  role: "technician",
  isActive: true,
  password: "",
  confirmPassword: "",
};

export function UsersAdmin() {
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState<AddFormState>(EMPTY_ADD_FORM);
  const [editUserId, setEditUserId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditFormState>(EMPTY_EDIT_FORM);
  const [loadError, setLoadError] = useState("");
  const [addError, setAddError] = useState("");
  const [editError, setEditError] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  const editingUser = users.find((user) => user.id === editUserId) ?? null;

  const refresh = useCallback(async () => {
    const res = await fetch("/api/users");
    if (!res.ok) throw new Error("Failed to load users");
    const data = (await res.json()) as UserAccount[];
    setUsers(
      data.map((user) => ({
        ...user,
        name: user.name ?? "",
        email: user.email ?? "",
        username: user.username ?? "",
      })),
    );
  }, []);

  useEffect(() => {
    void refresh()
      .catch(() => setLoadError("Could not load users."))
      .finally(() => setLoading(false));
  }, [refresh]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2200);
    return () => window.clearTimeout(t);
  }, [toast]);

  function openAddModal() {
    setAddForm(EMPTY_ADD_FORM);
    setAddError("");
    setAddOpen(true);
  }

  function closeAddModal() {
    setAddOpen(false);
    setAddForm(EMPTY_ADD_FORM);
    setAddError("");
  }

  function openEditModal(user: UserAccount) {
    setEditUserId(user.id);
    setEditForm({
      name: user.name ?? "",
      username: user.username ?? "",
      role: user.role,
      isActive: user.isActive,
      password: "",
      confirmPassword: "",
    });
    setEditError("");
  }

  function closeEditModal() {
    setEditUserId(null);
    setEditForm(EMPTY_EDIT_FORM);
    setEditError("");
  }

  async function createUser(e: React.FormEvent) {
    e.preventDefault();
    setAddError("");
    if (addForm.password !== addForm.confirmPassword) {
      setAddError("Passwords do not match.");
      return;
    }
    const { confirmPassword: _, ...payload } = addForm;
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setAddError(data.error ?? "Failed to create user");
      return;
    }
    closeAddModal();
    setToast("User created");
    await refresh();
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editUserId) return;

    setEditError("");
    const hasPassword =
      editForm.password.trim().length > 0 ||
      editForm.confirmPassword.trim().length > 0;

    if (hasPassword && editForm.password !== editForm.confirmPassword) {
      setEditError("Passwords do not match.");
      return;
    }

    const body: Record<string, unknown> = {
      name: editForm.name,
      username: editForm.username,
      role: editForm.role,
      isActive: editForm.isActive,
    };
    if (editForm.password.trim()) {
      body.password = editForm.password.trim();
    }

    const res = await fetch(`/api/users/${editUserId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setEditError(data.error ?? "Failed to update user");
      return;
    }
    closeEditModal();
    setToast("User updated");
    await refresh();
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 text-[var(--ink-muted)]">
        Loading users…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 pb-16 pt-4">
      <header className="mb-6">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-3xl font-semibold tracking-tight text-[var(--ink)]">
              Users
            </h1>
            <p className="mt-2 text-base text-[var(--ink-muted)]">
              Manage PMPs, team managers, and admins.
            </p>
          </div>
          <button
            type="button"
            onClick={openAddModal}
            className="ml-auto inline-flex min-h-11 shrink-0 items-center rounded-lg bg-[var(--accent)] px-4 text-sm font-semibold text-[var(--accent-ink)]"
          >
            + Add user
          </button>
        </div>
      </header>

      <div className="overflow-x-auto rounded-xl border border-[var(--line)] bg-[var(--surface)]">
        <table className="w-full min-w-[760px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--line)] bg-[var(--bg)]">
              {["Name", "Username", "Email", "Role", "Status", ""].map((h) => (
                <th
                  key={h}
                  className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-3 py-8 text-center text-[var(--ink-muted)]"
                >
                  No users yet. Add the first user to get started.
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id} className="border-b border-[var(--line)]">
                  <td className="px-3 py-3">{user.name}</td>
                  <td className="px-3 py-3 text-[var(--ink-muted)]">
                    {user.username || "—"}
                  </td>
                  <td className="px-3 py-3 text-[var(--ink-muted)]">
                    {user.email}
                  </td>
                  <td className="px-3 py-3">{ROLE_LABELS[user.role]}</td>
                  <td className="px-3 py-3">
                    {user.isActive ? (
                      <span className="text-[var(--ok)]">Active</span>
                    ) : (
                      <span className="text-[var(--ink-muted)]">Inactive</span>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <button
                      type="button"
                      onClick={() => openEditModal(user)}
                      className="text-sm font-semibold text-[var(--accent-deep)]"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {loadError && (
        <p className="mt-4 text-sm font-medium text-red-800" role="alert">
          {loadError}
        </p>
      )}

      {addOpen && (
        <UserFormModal
          title="Add user"
          description="Set a temporary password — email invites can come later."
          error={addError}
          onClose={closeAddModal}
          onSubmit={(e) => void createUser(e)}
          submitLabel="Create user"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1 sm:col-span-2">
              <span className={labelClass}>Name</span>
              <input
                required
                value={addForm.name}
                onChange={(e) =>
                  setAddForm({ ...addForm, name: e.target.value })
                }
                className={inputClass}
              />
            </label>
            <label className="block space-y-1">
              <span className={labelClass}>Username</span>
              <input
                required
                value={addForm.username}
                onChange={(e) =>
                  setAddForm({
                    ...addForm,
                    username: e.target.value.toLowerCase(),
                  })
                }
                className={inputClass}
                autoComplete="off"
                placeholder="e.g. jsmith"
              />
            </label>
            <label className="block space-y-1">
              <span className={labelClass}>Email</span>
              <input
                required
                type="email"
                value={addForm.email}
                onChange={(e) =>
                  setAddForm({ ...addForm, email: e.target.value })
                }
                className={inputClass}
              />
            </label>
            <label className="block space-y-1">
              <span className={labelClass}>Role</span>
              <select
                value={addForm.role}
                onChange={(e) =>
                  setAddForm({
                    ...addForm,
                    role: e.target.value as UserRole,
                  })
                }
                className={inputClass}
              >
                <option value="technician">{ROLE_LABELS.technician}</option>
                <option value="manager">{ROLE_LABELS.manager}</option>
                <option value="admin">{ROLE_LABELS.admin}</option>
              </select>
            </label>
            <label className="block space-y-1">
              <span className={labelClass}>Temp password</span>
              <PasswordField
                required
                value={addForm.password}
                onChange={(password) => setAddForm({ ...addForm, password })}
                autoComplete="new-password"
              />
            </label>
            <label className="block space-y-1">
              <span className={labelClass}>Confirm temp password</span>
              <PasswordField
                required
                value={addForm.confirmPassword}
                onChange={(confirmPassword) =>
                  setAddForm({ ...addForm, confirmPassword })
                }
                autoComplete="new-password"
              />
            </label>
          </div>
        </UserFormModal>
      )}

      {editUserId && editingUser && (
        <UserFormModal
          title="Edit user"
          description={editingUser.email}
          error={editError}
          onClose={closeEditModal}
          onSubmit={(e) => void saveEdit(e)}
          submitLabel="Save changes"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1 sm:col-span-2">
              <span className={labelClass}>Name</span>
              <input
                required
                value={editForm.name}
                onChange={(e) =>
                  setEditForm({ ...editForm, name: e.target.value })
                }
                className={inputClass}
              />
            </label>
            <label className="block space-y-1">
              <span className={labelClass}>Username</span>
              <input
                required
                value={editForm.username}
                onChange={(e) =>
                  setEditForm({
                    ...editForm,
                    username: e.target.value.toLowerCase(),
                  })
                }
                className={inputClass}
                autoComplete="off"
                placeholder="e.g. jsmith"
              />
            </label>
            <label className="block space-y-1">
              <span className={labelClass}>Role</span>
              <select
                value={editForm.role}
                onChange={(e) =>
                  setEditForm({
                    ...editForm,
                    role: e.target.value as UserRole,
                  })
                }
                className={inputClass}
              >
                <option value="technician">{ROLE_LABELS.technician}</option>
                <option value="manager">{ROLE_LABELS.manager}</option>
                <option value="admin">{ROLE_LABELS.admin}</option>
              </select>
            </label>
            <label className="block space-y-1 sm:col-span-2">
              <span className={labelClass}>Status</span>
              <label className="flex min-h-10 items-center gap-2 rounded-lg border border-[var(--line)] bg-[var(--bg)] px-2.5 text-sm">
                <input
                  type="checkbox"
                  checked={editForm.isActive}
                  onChange={(e) =>
                    setEditForm({ ...editForm, isActive: e.target.checked })
                  }
                />
                Active account
              </label>
            </label>
            <label className="block space-y-1">
              <span className={labelClass}>New password</span>
              <PasswordField
                value={editForm.password}
                onChange={(password) =>
                  setEditForm({ ...editForm, password })
                }
                autoComplete="new-password"
                placeholder="Leave blank to keep current"
              />
            </label>
            <label className="block space-y-1">
              <span className={labelClass}>Confirm new password</span>
              <PasswordField
                value={editForm.confirmPassword}
                onChange={(confirmPassword) =>
                  setEditForm({ ...editForm, confirmPassword })
                }
                autoComplete="new-password"
                placeholder="Leave blank to keep current"
              />
            </label>
          </div>
        </UserFormModal>
      )}

      {toast && (
        <div
          role="status"
          className="fixed top-4 right-4 z-[60] max-w-sm rounded-lg border border-[var(--ok)] bg-[var(--ok-soft)] px-4 py-3 text-sm font-semibold text-[var(--ok)] shadow-[var(--shadow)]"
        >
          {toast}
        </div>
      )}
    </div>
  );
}

function UserFormModal({
  title,
  description,
  error,
  onClose,
  onSubmit,
  submitLabel,
  children,
}: {
  title: string;
  description: string;
  error: string;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  submitLabel: string;
  children: React.ReactNode;
}) {
  const titleId = useId();

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="presentation"
    >
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-[var(--ink)]/45"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface)] shadow-[var(--shadow)]"
      >
        <div className="flex items-start justify-between gap-3 border-b border-[var(--line)] px-4 py-3">
          <div className="min-w-0">
            <h2
              id={titleId}
              className="text-lg font-semibold text-[var(--ink)]"
            >
              {title}
            </h2>
            <p className="truncate text-sm text-[var(--ink-muted)]">
              {description}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-9 shrink-0 rounded-lg px-2 text-sm font-semibold text-[var(--ink-muted)] hover:text-[var(--ink)]"
          >
            Close
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4 px-4 py-4">
          {children}

          {error && (
            <p className="text-sm font-medium text-red-800" role="alert">
              {error}
            </p>
          )}

          <div className="flex flex-wrap justify-end gap-2 border-t border-[var(--line)] pt-4">
            <button
              type="button"
              onClick={onClose}
              className="min-h-10 rounded-lg border border-[var(--line)] px-4 text-sm font-semibold text-[var(--ink)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="min-h-10 rounded-lg bg-[var(--accent)] px-4 text-sm font-semibold text-[var(--accent-ink)]"
            >
              {submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const labelClass =
  "text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]";

const inputClass =
  "min-h-10 w-full rounded-lg border border-[var(--line)] bg-[var(--bg)] px-2.5 text-sm text-[var(--ink)] outline-none focus:border-[var(--accent)]";

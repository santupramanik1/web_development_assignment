import { useState, useEffect } from "react";
import Head from "next/head";

interface Notice {
  id: string;
  title: string;
  body: string;
  category: "Exam" | "Event" | "General";
  priority: "Normal" | "Urgent";
  publishDate: string;
  image?: string | null;
  createdAt: string;
}

export default function Home() {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  // Form states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingNotice, setEditingNotice] = useState<Notice | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState<"Exam" | "Event" | "General">("General");
  const [priority, setPriority] = useState<"Normal" | "Urgent">("Normal");
  const [publishDate, setPublishDate] = useState("");
  const [image, setImage] = useState("");
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [formError, setFormError] = useState("");
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Delete states
  const [deletingNotice, setDeletingNotice] = useState<Notice | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Fetch notices
  const fetchNotices = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/notices");
      if (!res.ok) throw new Error("Failed to fetch notices");
      const data = await res.json();
      setNotices(data);
      setError("");
    } catch (err: any) {
      setError(err.message || "An error occurred while loading notices.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotices();
  }, []);

  // Open Form for Adding
  const handleAddClick = () => {
    setEditingNotice(null);
    setTitle("");
    setBody("");
    setCategory("General");
    setPriority("Normal");
    // Set default date to today in YYYY-MM-DD
    const today = new Date().toISOString().split("T")[0];
    setPublishDate(today);
    setImage("");
    setSelectedImageFile(null);
    setFormError("");
    setIsFormOpen(true);
  };

  // Open Form for Editing
  const handleEditClick = (notice: Notice) => {
    setEditingNotice(notice);
    setTitle(notice.title);
    setBody(notice.body);
    setCategory(notice.category);
    setPriority(notice.priority);
    // Format publishDate to YYYY-MM-DD for input field
    const formattedDate = new Date(notice.publishDate).toISOString().split("T")[0];
    setPublishDate(formattedDate);
    setImage(notice.image || "");
    setSelectedImageFile(null);
    setFormError("");
    setIsFormOpen(true);
  };

  // Handle selected image file upload
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setFormError("Image size must be less than 5MB.");
        return;
      }
      setSelectedImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
      };
      reader.onerror = () => {
        setFormError("Failed to read image file.");
      };
      reader.readAsDataURL(file);
    }
  };

  // Helper to convert File to base64 string
  const toBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });

  // Form Submit
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    // Browser-side basic validation
    if (!title.trim()) return setFormError("Title is required.");
    if (!body.trim()) return setFormError("Body is required.");
    if (!publishDate) return setFormError("Publish date is required.");

    setFormSubmitting(true);
    try {
      let imageUrl = image;

      if (selectedImageFile) {
        // Upload to S3 proxy endpoint
        const base64Data = await toBase64(selectedImageFile);
        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            file: base64Data,
            filename: selectedImageFile.name,
            filetype: selectedImageFile.type,
          }),
        });

        if (!uploadRes.ok) {
          const uploadError = await uploadRes.json();
          throw new Error(uploadError.error || "Failed to upload image.");
        }

        const uploadResult = await uploadRes.json();
        imageUrl = uploadResult.url;
      }

      const method = editingNotice ? "PUT" : "POST";
      const url = editingNotice ? `/api/notices/${editingNotice.id}` : "/api/notices";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          body,
          category,
          priority,
          publishDate,
          image: imageUrl.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Something went wrong saving the notice.");
      }

      setIsFormOpen(false);
      fetchNotices();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setFormSubmitting(false);
    }
  };

  // Delete Notice Action
  const handleDeleteConfirm = async () => {
    if (!deletingNotice) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/notices/${deletingNotice.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete notice");
      }
      setDeletingNotice(null);
      fetchNotices();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setDeleteLoading(false);
    }
  };

  // Filtered notices
  const filteredNotices = notices.filter(
    (notice) => selectedCategory === "All" || notice.category === selectedCategory
  );

  return (
    <>
      <Head>
        <title>Notice Board Hub</title>
      </Head>

      <div className="flex-1 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50">
        {/* Navigation / Header */}
        <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/70 backdrop-blur sticky top-0 z-30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-extrabold text-xl shadow-lg shadow-indigo-600/20">
                N
              </div>
              <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-indigo-600 to-indigo-400 bg-clip-text text-transparent dark:from-indigo-400 dark:to-indigo-200">
                Notice Board Hub
              </h1>
            </div>
            <button
              onClick={handleAddClick}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-md transition-all active:scale-95"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Notice
            </button>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Filters */}
          <div className="flex flex-wrap gap-2 mb-8">
            {["All", "Exam", "Event", "General"].map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  selectedCategory === cat
                    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-sm"
                    : "bg-white text-zinc-600 border border-zinc-200 hover:bg-zinc-50 dark:bg-zinc-900 dark:text-zinc-400 dark:border-zinc-800 dark:hover:bg-zinc-850"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Loading / Error States */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 dark:border-indigo-400"></div>
              <p className="mt-4 text-zinc-500 dark:text-zinc-400">Loading notices...</p>
            </div>
          ) : error ? (
            <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 rounded-2xl p-6 text-center max-w-lg mx-auto">
              <svg className="w-12 h-12 text-red-500 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <h3 className="text-lg font-bold text-red-800 dark:text-red-300">Database Connection Required</h3>
              <p className="text-sm text-red-600 dark:text-red-400 mt-2">
                {error}. Please ensure your `DATABASE_URL` is set up in your `.env.local` file and that you ran `npx prisma db push`.
              </p>
            </div>
          ) : filteredNotices.length === 0 ? (
            <div className="text-center py-20 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl">
              <svg className="w-16 h-16 text-zinc-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <h3 className="text-lg font-bold text-zinc-700 dark:text-zinc-300">No notices found</h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                There are no notices in the "{selectedCategory}" category yet.
              </p>
              <button
                onClick={handleAddClick}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-4 py-2 text-sm font-semibold text-white shadow"
              >
                Post a Notice
              </button>
            </div>
          ) : (
            /* Responsive Grid Listing */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredNotices.map((notice) => {
                const isUrgent = notice.priority === "Urgent";
                return (
                  <div
                    key={notice.id}
                    className={`group relative flex flex-col justify-between overflow-hidden rounded-2xl bg-white dark:bg-zinc-900 border transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${
                      isUrgent
                        ? "border-red-200 dark:border-red-900/60 shadow-md shadow-red-50 dark:shadow-none"
                        : "border-zinc-200 dark:border-zinc-800"
                    }`}
                  >
                    <div>
                      {/* Optional Notice Image */}
                      {notice.image && (
                        <div className="relative h-48 w-full overflow-hidden bg-zinc-100">
                          <img
                            src={notice.image}
                            alt={notice.title}
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                            onError={(e) => {
                              // If image fails to load, hide or replace
                              (e.target as HTMLElement).style.display = "none";
                            }}
                          />
                        </div>
                      )}

                      <div className="p-6">
                        {/* Badges Row */}
                        <div className="flex flex-wrap items-center gap-2 mb-3">
                          {isUrgent && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-red-100 dark:bg-red-950/50 px-2.5 py-0.5 text-xs font-semibold text-red-600 dark:text-red-400 animate-pulse">
                              <span className="h-1.5 w-1.5 rounded-full bg-red-600 dark:bg-red-400"></span>
                              Urgent
                            </span>
                          )}
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                              notice.category === "Exam"
                                ? "bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300"
                                : notice.category === "Event"
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                                : "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300"
                            }`}
                          >
                            {notice.category}
                          </span>
                          <span className="text-xs text-zinc-400 dark:text-zinc-500 ml-auto">
                            {new Date(notice.publishDate).toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </span>
                        </div>

                        {/* Title & Body */}
                        <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50 tracking-tight line-clamp-2">
                          {notice.title}
                        </h3>
                        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed whitespace-pre-line line-clamp-4">
                          {notice.body}
                        </p>
                      </div>
                    </div>

                    {/* Card Actions Footer */}
                    <div className="border-t border-zinc-100 dark:border-zinc-800 px-6 py-4 bg-zinc-50/50 dark:bg-zinc-900/50 flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleEditClick(notice)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-zinc-600 hover:text-zinc-900 hover:bg-zinc-150 dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-zinc-800 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                        Edit
                      </button>
                      <button
                        onClick={() => setDeletingNotice(notice)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-950/30 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>

        {/* Create / Edit Modal Form */}
        {isFormOpen && (
          <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity duration-300 animate-fadeIn">
            <div className="relative bg-white dark:bg-zinc-900 w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 transform scale-100 transition-transform duration-300">
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-zinc-150 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/50">
                <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
                  {editingNotice ? "Edit Notice" : "Create New Notice"}
                </h2>
                <button
                  onClick={() => setIsFormOpen(false)}
                  className="rounded-lg p-1 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 dark:hover:text-zinc-200 dark:hover:bg-zinc-800 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Form Content */}
              <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
                {formError && (
                  <div className="bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/50 text-sm p-3.5 rounded-xl">
                    {formError}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1">
                    Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter notice title"
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:bg-white dark:border-zinc-800 dark:bg-zinc-950 dark:focus:border-indigo-500 dark:focus:bg-zinc-900 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1">
                    Body *
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder="Describe the notice in detail..."
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:bg-white dark:border-zinc-800 dark:bg-zinc-950 dark:focus:border-indigo-500 dark:focus:bg-zinc-900 transition-all resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1">
                      Category
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value as any)}
                      className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:bg-white dark:border-zinc-800 dark:bg-zinc-950 dark:focus:border-indigo-500 dark:focus:bg-zinc-900 transition-all"
                    >
                      <option value="General">General</option>
                      <option value="Exam">Exam</option>
                      <option value="Event">Event</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1">
                      Priority
                    </label>
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value as any)}
                      className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:bg-white dark:border-zinc-800 dark:bg-zinc-950 dark:focus:border-indigo-500 dark:focus:bg-zinc-900 transition-all"
                    >
                      <option value="Normal">Normal</option>
                      <option value="Urgent">Urgent</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1">
                      Publish Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={publishDate}
                      onChange={(e) => setPublishDate(e.target.value)}
                      className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:bg-white dark:border-zinc-800 dark:bg-zinc-950 dark:focus:border-indigo-500 dark:focus:bg-zinc-900 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1">
                      Upload Image (Optional)
                    </label>
                    <div className="space-y-2">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="w-full text-sm text-zinc-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 dark:file:bg-zinc-800 dark:file:text-zinc-300 dark:hover:file:bg-zinc-700 focus:outline-none cursor-pointer"
                      />
                      {image && (
                        <div className="relative inline-block mt-2">
                          <img
                            src={image}
                            alt="Preview"
                            className="h-20 w-32 object-cover rounded-xl border border-zinc-200 dark:border-zinc-800 shadow"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setImage("");
                              setSelectedImageFile(null);
                            }}
                            className="absolute -top-1.5 -right-1.5 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 shadow-md transition-colors"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Submit Actions */}
                <div className="pt-4 border-t border-zinc-150 dark:border-zinc-800 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsFormOpen(false)}
                    className="px-4 py-2.5 rounded-xl text-sm font-semibold text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={formSubmitting}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-sm font-semibold text-white shadow disabled:opacity-55 transition-colors"
                  >
                    {formSubmitting && (
                      <span className="w-4 h-4 border-2 border-white/35 border-t-white rounded-full animate-spin"></span>
                    )}
                    {editingNotice ? "Save Changes" : "Post Notice"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deletingNotice && (
          <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
            <div className="relative bg-white dark:bg-zinc-900 w-full max-w-md rounded-2xl shadow-2xl p-6 border border-zinc-200 dark:border-zinc-800">
              <div className="flex gap-4">
                <div className="h-10 w-10 shrink-0 rounded-full bg-red-100 dark:bg-red-950/40 flex items-center justify-center text-red-600 dark:text-red-400">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">Delete Notice</h3>
                  <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400 leading-normal">
                    Are you sure you want to delete this notice? This action is permanent and cannot be undone.
                  </p>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setDeletingNotice(null)}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteConfirm}
                  disabled={deleteLoading}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-sm font-semibold text-white shadow disabled:opacity-55 transition-colors"
                >
                  {deleteLoading && (
                    <span className="w-4 h-4 border-2 border-white/35 border-t-white rounded-full animate-spin"></span>
                  )}
                  Delete Notice
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

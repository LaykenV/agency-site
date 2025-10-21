"use client";
import { api } from "@/convex/_generated/api";
import { useQuery, useMutation } from "convex/react";
import { useState } from "react";
import type { Doc, Id } from "@/convex/_generated/dataModel";

type ProspectDetails = Doc<"prospects">["details"];

const emptyDetails: ProspectDetails = {
  contactName: "",
  contactEmail: "",
  companyName: "",
  phone: "",
  currentWebsite: "",
  businessDescription: "",
  goals: "",
  notes: "",
};

export default function AdminPage() {
  const prospects = useQuery(api.admin.getProspects);
  const createProspect = useMutation(api.admin.createProspect);
  const updateProspect = useMutation(api.admin.updateProspectDetails);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingProspectId, setEditingProspectId] = useState<string | null>(null);
  const [formData, setFormData] = useState<ProspectDetails>(emptyDetails);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreateNew = () => {
    setFormData(emptyDetails);
    setEditingProspectId(null);
    setShowCreateForm(true);
  };

  const handleEdit = (prospect: Doc<"prospects">) => {
    setFormData(prospect.details);
    setEditingProspectId(prospect._id);
    setShowCreateForm(true);
  };

  const handleCancel = () => {
    setShowCreateForm(false);
    setEditingProspectId(null);
    setFormData(emptyDetails);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (editingProspectId) {
        await updateProspect({
          prospectId: editingProspectId as Id<"prospects">,
          details: formData,
        });
      } else {
        await createProspect({ details: formData });
      }
      handleCancel();
    } catch (error) {
      console.error("Error saving prospect:", error);
      alert("Failed to save prospect. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    field: keyof ProspectDetails
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: e.target.value,
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900">Admin - Prospects</h1>
          <button
            onClick={handleCreateNew}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg shadow-md transition"
          >
            + Add New Prospect
          </button>
        </div>

        {/* Create/Edit Form Modal */}
        {showCreateForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  {editingProspectId ? "Edit Prospect" : "Create New Prospect"}
                </h2>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Contact Name *
                    </label>
                    <input
                      type="text"
                      value={formData.contactName}
                      onChange={(e) => handleInputChange(e, "contactName")}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email *
                    </label>
                    <input
                      type="email"
                      value={formData.contactEmail}
                      onChange={(e) => handleInputChange(e, "contactEmail")}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Company Name *
                    </label>
                    <input
                      type="text"
                      value={formData.companyName}
                      onChange={(e) => handleInputChange(e, "companyName")}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => handleInputChange(e, "phone")}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Website
                    </label>
                    <input
                      type="url"
                      value={formData.currentWebsite}
                      onChange={(e) => handleInputChange(e, "currentWebsite")}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Business Description *
                    </label>
                    <textarea
                      value={formData.businessDescription}
                      onChange={(e) => handleInputChange(e, "businessDescription")}
                      required
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Goals *
                    </label>
                    <textarea
                      value={formData.goals}
                      onChange={(e) => handleInputChange(e, "goals")}
                      required
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Notes
                    </label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => handleInputChange(e, "notes")}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4 border-t">
                  <button
                    type="button"
                    onClick={handleCancel}
                    disabled={isSubmitting}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-md hover:bg-gray-50 transition disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition disabled:opacity-50"
                  >
                    {isSubmitting ? "Saving..." : editingProspectId ? "Update" : "Create"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Prospects List */}
        <div className="space-y-6">
          {prospects && prospects.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">No prospects yet</p>
              <button
                onClick={handleCreateNew}
                className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
              >
                Create the first one →
              </button>
            </div>
          ) : (
            prospects?.map((prospect) => (
              <div
                key={prospect.sessionId}
                className="border border-gray-300 rounded-lg p-6 bg-white shadow-sm hover:shadow-md transition"
              >
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">
                      {prospect.details.contactName}
                    </h2>
                    <p className="text-sm text-gray-500">{prospect.sessionId}</p>
                  </div>
                  <div className="text-right flex gap-2 justify-end">
                    <button
                      onClick={() => console.log("docusign webhook")}
                      className="px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 font-medium rounded-md transition"
                    >
                      Send Contract
                    </button>
                    <button
                      onClick={() => handleEdit(prospect)}
                      className="px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 font-medium rounded-md transition"
                    >
                      Edit
                    </button>
                    <p className="text-sm font-medium text-gray-700 self-center">
                      {prospect.planGenerationInProgress
                        ? "🔄 Generating Plan..."
                        : "✓ Ready"}
                    </p>
                  </div>
                </div>

                {/* Contact Details */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4 border-t pt-4">
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase">
                      Company
                    </p>
                    <p className="text-sm text-gray-900">{prospect.details.companyName}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase">
                      Email
                    </p>
                    <p className="text-sm text-gray-900">{prospect.details.contactEmail}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase">
                      Phone
                    </p>
                    <p className="text-sm text-gray-900">
                      {prospect.details.phone || "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase">
                      Website
                    </p>
                    <p className="text-sm text-gray-900">
                      {prospect.details.currentWebsite || "N/A"}
                    </p>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-xs font-semibold text-gray-500 uppercase">
                      Business Description
                    </p>
                    <p className="text-sm text-gray-900">
                      {prospect.details.businessDescription}
                    </p>
                  </div>
                </div>

                {/* Goals & Notes */}
                <div className="grid grid-cols-2 gap-4 mb-4 border-t pt-4">
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase">
                      Goals
                    </p>
                    <p className="text-sm text-gray-900">{prospect.details.goals}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase">
                      Notes
                    </p>
                    <p className="text-sm text-gray-900">
                      {prospect.details.notes || "N/A"}
                    </p>
                  </div>
                </div>

                {/* AI Generated Plan */}
                {prospect.aiGeneratedPlan && (
                  <div className="bg-blue-50 border border-blue-200 rounded p-4 mb-4">
                    <p className="text-sm font-semibold text-blue-900 mb-2">
                      📋 Generated Plan
                    </p>
                    <div className="space-y-2 text-sm text-blue-800">
                      <p>
                        <span className="font-semibold">Headline:</span>{" "}
                        {prospect.aiGeneratedPlan.headline}
                      </p>
                      <p>
                        <span className="font-semibold">Summary:</span>{" "}
                        {prospect.aiGeneratedPlan.summary}
                      </p>
                      <div>
                        <span className="font-semibold">Highlights:</span>
                        <ul className="list-disc list-inside mt-1">
                          {prospect.aiGeneratedPlan.highlights.map((h, i) => (
                            <li key={i}>{h}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <span className="font-semibold">Next Steps:</span>
                        <ul className="list-disc list-inside mt-1">
                          {prospect.aiGeneratedPlan.nextSteps.map((step, i) => (
                            <li key={i}>{step}</li>
        ))}
      </ul>
                      </div>
                    </div>
                  </div>
                )}

                {/* Metadata */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-gray-500 border-t pt-4">
                  <div>
                    <p className="font-semibold">Created</p>
                    <p>{new Date(prospect.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="font-semibold">Updated</p>
                    <p>{new Date(prospect.updatedAt).toLocaleDateString()}</p>
                  </div>
                  {prospect.calProspectBooking && (
                    <div>
                      <p className="font-semibold">Booking</p>
                      <p>
                        {new Date(prospect.calProspectBooking.scheduledAt).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
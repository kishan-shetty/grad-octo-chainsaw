import React, { useState, useEffect } from 'react';
import {
  ArrowUpDown,
  Mail,
  FileSpreadsheet,
  CheckCircle,
  XCircle,
  Users,
  Calendar,
  BarChart3,
  Percent,
} from 'lucide-react';

// Main App Component
function App() {
  const [candidates, setCandidates] = useState([]);
  const [filteredCandidates, setFilteredCandidates] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState('All batches');
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statsData, setStatsData] = useState({
    candidateCount: 0,
    whatsappSent: 0,
    phoneEnquiryDone: 0,
    topYears: [],
    attendanceRate: 0,
    onlineAttended: 0,
  });

  // Fetch data from Google Sheets via Express proxy
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Replace with your actual API endpoint
        const response = await fetch(
          'https://api-for-gsheet.onrender.com/api/candidates'
        );
        if (!response.ok) {
          throw new Error('Failed to fetch data');
        }
        const data = await response.json();
        setCandidates(data);

        // Extract unique batches
        const uniqueBatches = [
          ...new Set(data.map((candidate) => candidate.batch)),
        ].filter(Boolean);
        setBatches(uniqueBatches);

        setFilteredCandidates(data);
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Filter candidates when batch selection changes
  useEffect(() => {
    if (selectedBatch === 'All batches') {
      setFilteredCandidates(candidates);
    } else {
      setFilteredCandidates(
        candidates.filter((candidate) => candidate.batch === selectedBatch)
      );
    }
  }, [selectedBatch, candidates]);

  // Calculate statistics when filtered candidates change
  useEffect(() => {
    if (filteredCandidates.length > 0) {
      // Count stats
      const whatsappSent = filteredCandidates.filter(
        (c) => c.whatsappMsg === 'sent'
      ).length;
      const phoneEnquiryDone = filteredCandidates.filter(
        (c) => c.phoneEnquiry === 'done'
      ).length;

      // Count years of completion
      const yearsCount = {};
      filteredCandidates.forEach((c) => {
        if (c.yearOfCompletion) {
          yearsCount[c.yearOfCompletion] =
            (yearsCount[c.yearOfCompletion] || 0) + 1;
        }
      });

      const onlineAttended = filteredCandidates.filter(
        (c) => c.online === 'attended'
      ).length;

      // Get top 3 years
      const topYears = Object.entries(yearsCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([year, count]) => ({ year, count }));

      // Calculate attendance rate
      const attended = filteredCandidates.filter(
        (c) => c.program === 'attended'
      ).length;
      const total = filteredCandidates.filter(
        (c) => c.program === 'attended' || c.program === 'ghosted'
      ).length;
      const attendanceRate = total > 0 ? (attended / total) * 100 : 0;

      setStatsData({
        candidateCount: filteredCandidates.length,
        whatsappSent,
        phoneEnquiryDone,
        topYears,
        attendanceRate,
        onlineAttended,
      });
    }
  }, [filteredCandidates]);

  // Toggle status and update Google Sheet
  const toggleStatus = async (id, field, currentValue) => {
    // Define value pairs for toggling
    const toggleValues = {
      whatsappMsg: { sent: 'pending', pending: 'sent' },
      phoneEnquiry: { done: 'not done', 'not done': 'done' },
      online: { attended: 'absent', absent: 'attended' },
      program: { attended: 'ghosted', ghosted: 'attended' },
    };

    // Determine new value
    const newValue =
      toggleValues[field][currentValue] ||
      (field === 'whatsappMsg'
        ? 'sent'
        : field === 'phoneEnquiry'
        ? 'done'
        : field === 'online'
        ? 'attended'
        : 'attended');

    try {
      // Update locally first for responsive UI
      const updatedCandidates = candidates.map((candidate) =>
        candidate.id === id ? { ...candidate, [field]: newValue } : candidate
      );

      setCandidates(updatedCandidates);

      // Send update to backend
      const response = await fetch(
        'https://api-for-gsheet.onrender.com/api/update-candidate',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            id,
            field,
            value: newValue,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to update');
      }
    } catch (err) {
      // Revert on error
      setError('Failed to update. Please try again.');
      setCandidates([...candidates]); // Reset to original state
    }
  };

  // Send reminder emails
  const sendReminders = async (days, batchName) => {
    try {
      const response = await fetch(
        'https://api-for-gsheet.onrender.com/api/send-reminders',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            days,
            batch: batchName,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to send reminders');
      }

      alert(
        `Reminder emails sent to ${batchName} candidates for ${days} days before program`
      );
    } catch (err) {
      setError('Failed to send reminders. Please try again.');
    }
  };

  if (loading)
    return (
      <div className="flex h-screen justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );

  if (error)
    return (
      <div className="flex h-screen justify-center items-center">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          Error: {error}
        </div>
      </div>
    );

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-md">
        <div className="p-4 border-b">
          <h1 className="text-xl font-semibold text-gray-800">
            Candidate Dashboard
          </h1>
        </div>

        <div className="p-4">
          <h2 className="text-md font-medium text-gray-600 mb-3">Batches</h2>
          <ul>
            <li
              className={`p-2 rounded mb-1 cursor-pointer ${
                selectedBatch === 'All batches'
                  ? 'bg-blue-100 text-blue-700'
                  : 'hover:bg-gray-100'
              }`}
              onClick={() => setSelectedBatch('All batches')}
            >
              All batches
            </li>
            {batches.map((batch) => (
              <li
                key={batch}
                className={`p-2 rounded mb-1 cursor-pointer ${
                  selectedBatch === batch
                    ? 'bg-blue-100 text-blue-700'
                    : 'hover:bg-gray-100'
                }`}
                onClick={() => setSelectedBatch(batch)}
              >
                {batch.split(' ').slice(0, 2).join(' ')}
              </li>
            ))}
          </ul>
        </div>

        <div className="p-4 border-t">
          <h2 className="text-md font-medium text-gray-600 mb-3">
            Send Reminders
          </h2>
          {selectedBatch !== 'All batches' ? (
            <div className="space-y-2">
              <button
                onClick={() => sendReminders(10, selectedBatch)}
                className="w-full p-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                10 days before
              </button>
              <button
                onClick={() => sendReminders(7, selectedBatch)}
                className="w-full p-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                7 days before
              </button>
              <button
                onClick={() => sendReminders(5, selectedBatch)}
                className="w-full p-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                5 days before
              </button>
              <button
                onClick={() => sendReminders(3, selectedBatch)}
                className="w-full p-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                3 days before
              </button>
            </div>
          ) : (
            <p className="text-sm text-gray-500">
              Select a specific batch to send reminders
            </p>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {/* Stats Cards */}
        <div className="p-6 grid grid-cols-3 gap-6">
          {/* Card 1 */}
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center mb-4">
              <Users className="h-5 w-5 text-blue-500 mr-2" />
              <h2 className="text-lg font-medium">Candidate Stats</h2>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Candidates:</span>
                <span className="font-semibold">
                  {statsData.candidateCount}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">WhatsApp Sent:</span>
                <span className="font-semibold">{statsData.whatsappSent}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Phone Enquiry Done:</span>
                <span className="font-semibold">
                  {statsData.phoneEnquiryDone}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Online Session Attended:</span>
                <span className="font-semibold">
                  {statsData.onlineAttended}
                </span>
              </div>
            </div>
          </div>

          {/* Card 2 */}
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center mb-4">
              <Calendar className="h-5 w-5 text-blue-500 mr-2" />
              <h2 className="text-lg font-medium">Top Graduation Years</h2>
            </div>
            <div className="space-y-3">
              {statsData.topYears.length > 0 ? (
                statsData.topYears.map((yearData, index) => (
                  <div key={index} className="flex justify-between">
                    <span className="text-gray-600">Year {yearData.year}:</span>
                    <span className="font-semibold">
                      {yearData.count} candidates
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-gray-500">No data available</p>
              )}
            </div>
          </div>

          {/* Card 3 */}
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center mb-4">
              <Percent className="h-5 w-5 text-blue-500 mr-2" />
              <h2 className="text-lg font-medium">Attendance Rate</h2>
            </div>
            <div className="mt-4 text-center">
              <div className="inline-flex items-center justify-center rounded-full h-24 w-24 bg-blue-50 text-blue-500 border-4 border-blue-100">
                <span className="text-xl font-bold">
                  {statsData.attendanceRate.toFixed(1)}%
                </span>
              </div>
              <p className="mt-3 text-gray-600">Program Attendance</p>
            </div>
          </div>
        </div>

        {/* Candidate Table */}
        <div className="px-6 pb-6">
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="p-4 border-b">
              <h2 className="text-lg font-medium">
                {selectedBatch === 'All batches'
                  ? 'All Candidates'
                  : `${selectedBatch} Candidates`}
                ({filteredCandidates.length})
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 table-fixed">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      College
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Batch
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      WhatsApp
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Phone
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Online
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Program
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredCandidates.map((candidate, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(
                          candidate.dateOfApplication
                        ).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {candidate.fullName}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {candidate.contactNumber}
                        </div>
                        <div className="text-sm text-gray-500">
                          {candidate.emailId}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {candidate.nameOfCollege}
                        </div>
                        <div className="text-sm text-gray-500">
                          {candidate.stream}, {candidate.yearOfCompletion}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {candidate.batch}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() =>
                            toggleStatus(
                              candidate.id,
                              'whatsappMsg',
                              candidate.whatsappMsg
                            )
                          }
                          className={`inline-flex items-center px-2.5 py-1.5 border rounded text-xs font-medium 
                            ${
                              candidate.whatsappMsg === 'sent'
                                ? 'bg-green-100 text-green-800 border-green-200'
                                : 'bg-yellow-100 text-yellow-800 border-yellow-200'
                            }`}
                        >
                          {candidate.whatsappMsg === 'sent' ? (
                            <>
                              <CheckCircle className="h-3 w-3 mr-1" /> Sent
                            </>
                          ) : (
                            <>
                              <XCircle className="h-3 w-3 mr-1" /> Pending
                            </>
                          )}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() =>
                            toggleStatus(
                              candidate.id,
                              'phoneEnquiry',
                              candidate.phoneEnquiry
                            )
                          }
                          className={`inline-flex items-center px-2.5 py-1.5 border rounded text-xs font-medium 
                            ${
                              candidate.phoneEnquiry === 'done'
                                ? 'bg-green-100 text-green-800 border-green-200'
                                : 'bg-yellow-100 text-yellow-800 border-yellow-200'
                            }`}
                        >
                          {candidate.phoneEnquiry === 'done' ? (
                            <>
                              <CheckCircle className="h-3 w-3 mr-1" /> Done
                            </>
                          ) : (
                            <>
                              <XCircle className="h-3 w-3 mr-1" /> Not Done
                            </>
                          )}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() =>
                            toggleStatus(
                              candidate.id,
                              'online',
                              candidate.online
                            )
                          }
                          className={`inline-flex items-center px-2.5 py-1.5 border rounded text-xs font-medium 
                            ${
                              candidate.online === 'attended'
                                ? 'bg-green-100 text-green-800 border-green-200'
                                : 'bg-red-100 text-red-800 border-red-200'
                            }`}
                        >
                          {candidate.online === 'attended' ? (
                            <>
                              <CheckCircle className="h-3 w-3 mr-1" /> Attended
                            </>
                          ) : (
                            <>
                              <XCircle className="h-3 w-3 mr-1" /> Absent
                            </>
                          )}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() =>
                            toggleStatus(
                              candidate.id,
                              'program',
                              candidate.program
                            )
                          }
                          className={`inline-flex items-center px-2.5 py-1.5 border rounded text-xs font-medium 
                            ${
                              candidate.program === 'attended'
                                ? 'bg-green-100 text-green-800 border-green-200'
                                : 'bg-red-100 text-red-800 border-red-200'
                            }`}
                        >
                          {candidate.program === 'attended' ? (
                            <>
                              <CheckCircle className="h-3 w-3 mr-1" /> Attended
                            </>
                          ) : (
                            <>
                              <XCircle className="h-3 w-3 mr-1" /> Ghosted
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;

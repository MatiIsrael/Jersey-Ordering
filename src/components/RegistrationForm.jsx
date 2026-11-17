import { useMemo, useRef, useState } from 'react'
import { isFirebaseConfigured, createRegistration } from '../lib/firebase.js'
import { generateRegistrationId } from '../lib/ids.js'
import { PAYMENT } from '../config.js'

export const TSHIRT_SIZES = ['S', 'M', 'L', 'XL', 'XXL']
import JerseyCard from './JerseyCard.jsx'

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png']
const MAX_FILE_SIZE_MB = 5

const initialForm = {
  fullName: '',
  jerseyNumber: '',
  tshirtSize: '',
  noTshirtPrint: false,
}

/** Runs every validation rule; returns an object of field errors. */
function validate(form, file) {
  const errors = {}

  const name = form.fullName.trim()
  if (!name) {
    errors.fullName = 'Full name is required.'
  } else if (name.length < 3) {
    errors.fullName = 'Full name must be at least 3 characters.'
  } else if (!/^[A-Z\s.'-]+$/i.test(name)) {
    errors.fullName = 'Full name can only contain letters and spaces.'
  }

  if (!form.noTshirtPrint) {
    const raw = form.jerseyNumber.trim()
    if (!raw || !/^\d+$/.test(raw)) {
      errors.jerseyNumber = 'Please enter a jersey number from 0–99.'
    } else {
      const n = Number(raw)
      if (!Number.isInteger(n) || n < 0 || n > 99) {
        errors.jerseyNumber = 'Please enter a jersey number from 0–99.'
      }
    }
  }

  if (!form.tshirtSize) {
    errors.tshirtSize = 'Please select a T-shirt size.'
  }

  if (!file) {
    errors.paymentScreenshot = 'Please upload your payment screenshot.'
  }

  return errors
}

function ErrorText({ children }) {
  return (
    <p role="alert" className="error-text">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" /></svg>
      {children}
    </p>
  )
}

/** Numbered form section heading. */
function Section({ number, title, helper, error, children, id }) {
  return (
    <section id={id} className="scroll-mt-20" data-invalid={error ? 'true' : undefined}>
      <div className="mb-4 flex items-start gap-3">
        <span
          className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
            error
              ? 'bg-[#fef3f2] text-[#b42318] ring-1 ring-[#fecdca]'
              : 'bg-[#eef2ff] text-[#4f46e5] ring-1 ring-[#c7d2fe]'
          }`}
        >
          {number}
        </span>
        <div>
          <h2 className="text-base font-bold tracking-tight text-[#101828] sm:text-lg">{title}</h2>
          {helper && <p className="mt-0.5 text-[0.8125rem] text-[#667085]">{helper}</p>}
        </div>
      </div>
      <div className="sm:pl-10">{children}</div>
    </section>
  )
}

export default function RegistrationForm() {
  const [form, setForm] = useState(initialForm)
  const [file, setFile] = useState(null)
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [topError, setTopError] = useState('')
  const [successId, setSuccessId] = useState(null)
  const submitLock = useRef(false) // guards against double-click duplicates
  const fileInputRef = useRef(null)
  const cardTopRef = useRef(null)

  // Manage the object URL lifecycle for the image preview
  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file])
  const [prevUrl, setPrevUrl] = useState(null)
  if (prevUrl !== previewUrl) {
    if (prevUrl) URL.revokeObjectURL(prevUrl)
    setPrevUrl(previewUrl)
  }

  const scrollTop = () => cardTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  const setField = (name, value) => {
    setForm((f) => ({ ...f, [name]: value }))
    setErrors((e) => {
      const rest = { ...e }
      delete rest[name]
      return rest
    })
  }

  const handleNameChange = (e) => {
    // Automatically convert input to CAPITAL LETTERS, e.g. "MATI ISRAEL"
    setField('fullName', e.target.value.toUpperCase())
  }

  const handleJerseyChange = (e) => {
    // Only digits, max 2 characters (0–99)
    const digits = e.target.value.replace(/\D/g, '').slice(0, 2)
    setField('jerseyNumber', digits)
  }

  const handleNoPrintChange = (e) => {
    const checked = e.target.checked
    setForm((f) => ({ ...f, noTshirtPrint: checked }))
    setErrors((er) => {
      const rest = { ...er }
      if (checked) delete rest.jerseyNumber
      return rest
    })
  }

  const handleFileChange = (e) => {
    const selected = e.target.files && e.target.files[0]
    if (!selected) return

    if (!ALLOWED_IMAGE_TYPES.includes(selected.type)) {
      setErrors((er) => ({ ...er, paymentScreenshot: 'Only JPG, JPEG or PNG images are allowed.' }))
      e.target.value = ''
      return
    }
    if (selected.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      setErrors((er) => ({ ...er, paymentScreenshot: `Image is too large. Maximum size is ${MAX_FILE_SIZE_MB}MB.` }))
      e.target.value = ''
      return
    }

    setFile(selected)
    setErrors((er) => {
      const rest = { ...er }
      delete rest.paymentScreenshot
      return rest
    })
    e.target.value = '' // allow re-selecting the same file later
  }

  const removeFile = () => {
    setFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (submitLock.current) return // prevent double submission
    setTopError('')

    // 1. Validate everything on the client before touching the network
    const fieldErrors = validate(form, file)
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors)
      setTopError('Please fix the highlighted fields below before submitting.')
      const firstInvalid = document.querySelector('[data-invalid="true"]')
      if (firstInvalid) firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'start' })
      return
    }

    if (!isFirebaseConfigured) {
      setTopError(
        'The server is not configured yet. The site owner must add the Firebase credentials in the .env file (see README, Step 1).',
      )
      scrollTop()
      return
    }

    submitLock.current = true
    setSubmitting(true)

    try {
      const registrationId = generateRegistrationId()

      // Upload the payment screenshot to Firebase Storage and
      // save the registration document in Firestore
      const payload = {
        full_name: form.fullName.trim().toUpperCase(),
        jersey_number: form.noTshirtPrint ? null : Number(form.jerseyNumber.trim()),
        tshirt_size: form.tshirtSize,
        no_tshirt_print: form.noTshirtPrint,
        payment_method: 'Unspecified',
      }

      await createRegistration({ registrationId, payload, file })

      // Success — show the confirmation with the motion jersey
      setSuccessId(registrationId)
      scrollTop()
    } catch (err) {
      setTopError(err.message || 'Something went wrong. Please try again.')
      scrollTop()
    } finally {
      submitLock.current = false
      setSubmitting(false)
    }
  }

  const resetAll = () => {
    setForm(initialForm)
    removeFile()
    setErrors({})
    setTopError('')
    setSuccessId(null)
    scrollTop()
  }

  /* ================= SUCCESS (final state) ================= */
  if (successId) {    return (
      <section id="register" ref={cardTopRef} className="scroll-mt-6">
        <div className="card card-lg px-6 py-10 text-center sm:px-10">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-[#ecfdf3] ring-8 ring-[#ecfdf3]/60">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#12b76a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
          </div>
          <h2 className="h1 text-[1.75rem]">Successfully Submitted!</h2>
          <p className="mx-auto mt-3 max-w-md text-[0.9375rem] leading-relaxed text-[#667085]">
            Your AUWC Order Jersey registration has been submitted successfully. We will verify your payment
            and confirm your spot.
          </p>

          {/* Motion jersey — the student's T-shirt back with printed name & number */}
          <div className="mt-9">
            <JerseyCard
              name={form.fullName}
              number={form.noTshirtPrint ? '' : form.jerseyNumber.trim()}
              noPrint={form.noTshirtPrint}
              size={form.tshirtSize}
            />
          </div>

          <div className="mx-auto mt-8 max-w-sm rounded-xl border border-[#e4e7ec] bg-[#f9fafb] px-5 py-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#667085]">Your Registration ID</p>
            <p className="mono mt-1 text-xl font-bold tracking-wide text-[#101828] select-all">{successId}</p>
            <p className="mt-2 text-xs text-[#667085]">
              Save or screenshot this ID — you may be asked for it at the entrance.
            </p>
          </div>

          <button type="button" onClick={resetAll} className="btn btn-secondary mt-8 w-full sm:w-auto">
            Register another student
          </button>
        </div>
      </section>
    )
  }

  const inputClass = (hasError) => `input ${hasError ? 'invalid' : ''}`

  return (
    <section id="register" ref={cardTopRef} className="scroll-mt-6">
      <form onSubmit={handleSubmit} noValidate>
        <div className="card card-lg px-5 py-6 sm:px-8 sm:py-8">
          {topError && (
            <div role="alert" className="banner banner-error mb-7">
              <svg className="mt-0.5 shrink-0" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="m15 9-6 6M9 9l6 6" /></svg>
              <p>{topError}</p>
            </div>
          )}

          <div className="grid gap-9">
            {/* ---------- PAYMENT INFORMATION (read first) ---------- */}
            <section id="payment" className="scroll-mt-20">
              <div className="mb-4 flex items-start gap-3">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#eef2ff] text-[#4f46e5] ring-1 ring-[#c7d2fe]">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20" /></svg>
                </span>
                <div>
                  <h2 className="text-base font-bold tracking-tight text-[#101828] sm:text-lg">
                    Payment Information
                  </h2>
                  <p className="mt-0.5 text-[0.8125rem] text-[#667085]">
                    Pay {PAYMENT.price} first — then fill in the form below.
                  </p>
                </div>
              </div>

              <div className="sm:pl-10">
                {/* Data table */}
                <div className="overflow-hidden rounded-xl border border-[#e4e7ec]">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Payment Information</th>
                        <th>Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="font-medium text-[#344054]">Price</td>
                        <td className="font-bold text-[#101828]">
                          {PAYMENT.price}
                        </td>
                      </tr>
                      <tr>
                        <td className="font-medium text-[#344054]">Account Name</td>
                        <td className="font-bold text-[#101828]">{PAYMENT.holderName}</td>
                      </tr>
                      <tr>
                        <td className="font-medium text-[#344054]">Telebirr</td>
                        <td className="mono font-semibold text-[#101828]">{PAYMENT.telebirr}</td>
                      </tr>
                      <tr>
                        <td className="font-medium text-[#344054]">CBE</td>
                        <td className="mono font-semibold text-[#101828]">{PAYMENT.cbe}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </section>

            <hr className="border-[#f2f4f7]" />

            {/* ---------- 1. FULL NAME ---------- */}
            <Section
              number="1"
              title="Full Name"
              helper="As it should appear on the attendee list."
              id="name"
              error={errors.fullName}
            >
              <label htmlFor="fullName" className="label">
                FULL NAME <span className="req">*</span>
              </label>
              <input
                id="fullName"
                name="fullName"
                type="text"
                autoComplete="name"
                className={inputClass(errors.fullName)}
                placeholder="MATI ISRAEL"
                value={form.fullName}
                onChange={handleNameChange}
                aria-invalid={Boolean(errors.fullName)}
                aria-describedby={errors.fullName ? 'fullName-error' : undefined}
              />
              <p className="help-text">Your name exactly as it should appear — it will be printed in capitals.</p>
              {errors.fullName && <ErrorText>{errors.fullName}</ErrorText>}
            </Section>

            <hr className="border-[#f2f4f7]" />

            {/* ---------- 2. JERSEY NUMBER ---------- */}
            <Section
              number="2"
              title="Select Jersey Number"
              helper={
                form.noTshirtPrint
                  ? 'Printing disabled — you can continue without a number.'
                  : 'Choose the number printed on your T-shirt.'
              }
              id="jersey"
              error={errors.jerseyNumber}
            >
              <label htmlFor="jerseyNumber" className="label">
                JERSEY NUMBER{' '}
                {form.noTshirtPrint ? (
                  <span className="opt">(optional)</span>
                ) : (
                  <span className="req">*</span>
                )}
              </label>
              <input
                id="jerseyNumber"
                name="jerseyNumber"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="off"
                className={inputClass(errors.jerseyNumber)}
                placeholder="e.g. 10"
                value={form.jerseyNumber}
                onChange={handleJerseyChange}
                disabled={form.noTshirtPrint}
                aria-invalid={Boolean(errors.jerseyNumber)}
                aria-describedby={errors.jerseyNumber ? 'jerseyNumber-error' : undefined}
              />
              <p className="help-text">Allowed range: 0–99.</p>
              {errors.jerseyNumber && <ErrorText>{errors.jerseyNumber}</ErrorText>}

              {/* T-shirt size — horizontal single-select */}
              <span className="label mt-6">SIZE <span className="req">*</span></span>
              <div
                role="radiogroup"
                aria-label="T-shirt size"
                className={`mt-1 flex flex-wrap gap-2 ${errors.tshirtSize ? 'rounded-xl ring-4 ring-[#d92d20]/10' : ''}`}
              >
                {TSHIRT_SIZES.map((s) => {
                  const selected = form.tshirtSize === s
                  return (
                    <button
                      key={s}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => setField('tshirtSize', s)}
                      className={`min-w-[3.75rem] rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors ${
                        selected
                          ? 'border-[#4f46e5] bg-[#4f46e5] text-white shadow-sm'
                          : errors.tshirtSize
                            ? 'border-[#f97066] bg-white text-[#344054] hover:border-[#d92d20]'
                            : 'border-[#d0d5dd] bg-white text-[#344054] hover:border-[#b8bfc9]'
                      }`}
                    >
                      {s}
                    </button>
                  )
                })}
              </div>
              <p className="help-text">Tap one: S, M, L, XL or XXL — your T-shirt will be this size.</p>
              {errors.tshirtSize && <ErrorText>{errors.tshirtSize}</ErrorText>}

              <label
                htmlFor="noTshirtPrint"
                className={`mt-5 flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors ${
                  form.noTshirtPrint
                    ? 'border-[#4f46e5] bg-[#eef2ff] ring-4 ring-[#4f46e5]/10'
                    : 'border-[#d0d5dd] bg-white hover:border-[#b8bfc9]'
                }`}
              >
                <input
                  id="noTshirtPrint"
                  name="noTshirtPrint"
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-[#4f46e5]"
                  checked={form.noTshirtPrint}
                  onChange={handleNoPrintChange}
                />
                <span>
                  <span className="block text-sm font-semibold text-[#101828]">
                    I don&apos;t want my name and jersey number printed on my T-shirt
                  </span>
                  <span className="mt-0.5 block text-xs text-[#667085]">
                    If you tick this, you can submit without entering a jersey number.
                  </span>
                </span>
              </label>
            </Section>

            <hr className="border-[#f2f4f7]" />

            {/* ---------- 3. PAYMENT SCREENSHOT ---------- */}
            <Section
              number="3"
              title="Upload Payment Screenshot"
              helper="Attach the transfer confirmation or receipt photo as proof of payment."
              id="upload"
              error={errors.paymentScreenshot}
            >
              <label className="label">
                PAYMENT SCREENSHOT <span className="req">*</span>
              </label>
              <p className="help-text mt-0 mb-4">JPG, JPEG or PNG — maximum {MAX_FILE_SIZE_MB}MB.</p>

              {!file ? (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className={`dropzone ${errors.paymentScreenshot ? 'invalid' : ''}`}
                >
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#eef2ff]">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                  </span>
                  <span className="text-sm font-semibold text-[#344054]">
                    Tap to upload your payment screenshot
                  </span>
                  <span className="text-xs text-[#667085]">
                    The transfer confirmation or receipt photo — JPG, JPEG or PNG
                  </span>
                </button>
              ) : (
                <div className="flex flex-col gap-4 rounded-xl border border-[#e4e7ec] bg-[#f9fafb] p-4 sm:flex-row sm:items-center">
                  <img
                    src={previewUrl}
                    alt="Payment screenshot preview"
                    className="h-36 w-full rounded-lg border border-[#e4e7ec] object-cover sm:h-24 sm:w-24"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-[#101828]">{file.name}</p>
                    <p className="mt-0.5 text-xs text-[#667085]">{(file.size / 1024).toFixed(0)} KB</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="btn btn-secondary !px-3.5 !py-2 !text-[0.8125rem]"
                      >
                        Change image
                      </button>
                      <button
                        type="button"
                        onClick={removeFile}
                        className="btn btn-danger !px-3.5 !py-2 !text-[0.8125rem]"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                  <span className="badge badge-green self-start sm:self-center">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                    Ready
                  </span>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                className="hidden"
                onChange={handleFileChange}
                aria-label="Payment screenshot file input"
              />

              {errors.paymentScreenshot && <ErrorText>{errors.paymentScreenshot}</ErrorText>}
            </Section>

            <hr className="border-[#f2f4f7]" />

            {/* ---------- 4. SUBMIT ---------- */}
            <Section
              number="4"
              title="Submit"
              helper="Double-check your details above, then submit your registration."
            >
              <div className="break-words rounded-xl bg-[#f9fafb] px-4 py-3 text-sm leading-relaxed text-[#667085]">
                <span className="font-semibold text-[#344054]">Summary — </span>
                {form.fullName.trim() ? (
                  <span className="font-semibold text-[#101828]">{form.fullName.trim()}</span>
                ) : (
                  'name not entered yet'
                )}
                {' · '}
                {form.noTshirtPrint
                  ? 'no T-shirt printing'
                  : form.jerseyNumber.trim()
                    ? `jersey ${form.jerseyNumber.trim()}`
                    : 'jersey not chosen'}
                {' · '}
                {form.tshirtSize ? `size ${form.tshirtSize}` : 'size not selected'}
                {' · '}
                {file ? 'screenshot attached' : 'screenshot missing'}
              </div>

              <button type="submit" disabled={submitting} className="btn btn-primary mt-5 w-full !py-3.5 !text-base">
                {submitting ? (
                  <>
                    <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M21 12a9 9 0 1 1-6.22-8.56" /></svg>
                    Submitting…
                  </>
                ) : (
                  <>
                    Submit Registration
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                  </>
                )}
              </button>
              <p className="mt-3.5 text-center text-xs leading-relaxed text-[#98a2b3]">
                By submitting, you confirm that you paid {PAYMENT.price} and that your details are correct. Your
                information is stored securely and only visible to event administrators.
              </p>
            </Section>
          </div>
        </div>
      </form>
    </section>
  )
}

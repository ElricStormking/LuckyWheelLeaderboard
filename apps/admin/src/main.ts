import {
  EventStatus,
  PlatformLinkType,
  WheelSegmentOperator,
} from "@lucky-wheel/contracts";
import type {
  AdminAuditLogResponse,
  AdminUploadedImageDeleteResponse,
  AdminEventConfigDto,
  AdminEventDashboardResponse,
  AdminEventEditorResponse,
  AdminPrizeImageUploadResponse,
  AdminEventTermsUpdateRequest,
  AdminPlatformLinksUpdateRequest,
  AdminEventUpsertRequest,
  AdminOverviewResponse,
  AdminParticipantsResponse,
  AdminSpinRecordsResponse,
  AppLocale,
} from "@lucky-wheel/contracts";
import "./styles.css";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000/api";
const SUPPORTED_LOCALES: AppLocale[] = ["en", "ms", "zh-CN"];
const PRIZE_IMAGE_RECOMMENDED_WIDTH = 900;
const PRIZE_IMAGE_RECOMMENDED_HEIGHT = 600;
const PRIZE_IMAGE_MIN_WIDTH = 300;
const PRIZE_IMAGE_MIN_HEIGHT = 180;
const PRIZE_IMAGE_MIN_ASPECT_RATIO = 1.2;
const PRIZE_IMAGE_MAX_ASPECT_RATIO = 2.2;
const SECTION_ORDER = [
  "capital",
  "roulette",
  "prizes",
  "terms",
  "links",
  "participants",
  "spins",
  "audit",
] as const;

type AdminSection = (typeof SECTION_ORDER)[number];
type ToastState = { tone: "success" | "error"; message: string } | null;
type PrizeUploadDimensions = { width: number; height: number };

type AdminState = {
  locale: AppLocale;
  selectedLocaleTab: AppLocale;
  activeSection: AdminSection;
  overview?: AdminOverviewResponse;
  editor?: AdminEventEditorResponse;
  dashboard?: AdminEventDashboardResponse;
  participants?: AdminParticipantsResponse;
  spins?: AdminSpinRecordsResponse;
  audit?: AdminAuditLogResponse;
  draft?: AdminEventConfigDto;
  selectedEventId?: string;
  isBootstrapping: boolean;
  isSaving: boolean;
  uploadingPrizeIndex?: number;
  uploadingPrizeProgress?: number;
  prizeUploadWarnings: Record<number, string>;
  prizeUploadDimensions: Record<number, PrizeUploadDimensions>;
  toast: ToastState;
  error?: string;
};

const appRoot = document.querySelector<HTMLDivElement>("#app");

if (!appRoot) {
  throw new Error("Admin root element not found.");
}

const app = appRoot;
const state: AdminState = {
  locale: "en",
  selectedLocaleTab: "en",
  activeSection: "capital",
  isBootstrapping: true,
  isSaving: false,
  uploadingPrizeIndex: undefined,
  uploadingPrizeProgress: undefined,
  prizeUploadWarnings: {},
  prizeUploadDimensions: {},
  toast: null,
};

void bootstrap();

async function bootstrap() {
  render();

  try {
    await loadOverview(true);
    window.setInterval(() => {
      void refreshCurrentWorkspace();
    }, 30000);
  } catch (error) {
    state.error = toErrorMessage(error);
    state.isBootstrapping = false;
    render();
  }
}

async function loadOverview(shouldLoadWorkspace: boolean) {
  state.isBootstrapping = true;
  state.isSaving = false;
  state.error = undefined;
  render();

  const overview = await request<AdminOverviewResponse>(
    `/v2/admin/overview?locale=${encodeURIComponent(state.locale)}`,
  );

  state.overview = overview;
  if (!state.selectedEventId) {
    state.selectedEventId =
      overview.currentEventId ?? overview.events[0]?.id ?? undefined;
  }

  if (shouldLoadWorkspace && state.selectedEventId) {
    await loadEventWorkspace(state.selectedEventId);
  } else {
    state.isBootstrapping = false;
    state.isSaving = false;
    render();
  }
}

async function loadEventWorkspace(eventId: string) {
  state.isBootstrapping = true;
  state.error = undefined;
  render();

  try {
    const [editor, dashboard, participants, spins, audit] = await Promise.all([
      request<AdminEventEditorResponse>(
        `/v2/admin/events/${encodeURIComponent(eventId)}/editor?locale=${encodeURIComponent(state.locale)}`,
      ),
      request<AdminEventDashboardResponse>(
        `/v2/admin/events/${encodeURIComponent(eventId)}/dashboard?locale=${encodeURIComponent(state.locale)}`,
      ),
      request<AdminParticipantsResponse>(
        `/v2/admin/events/${encodeURIComponent(eventId)}/participants?page=1&pageSize=12`,
      ),
      request<AdminSpinRecordsResponse>(
        `/v2/admin/events/${encodeURIComponent(eventId)}/spins?page=1&pageSize=12`,
      ),
      request<AdminAuditLogResponse>(
        `/v2/admin/events/${encodeURIComponent(eventId)}/audit?page=1&pageSize=12`,
      ),
    ]);

    state.selectedEventId = eventId;
    state.editor = editor;
    state.dashboard = dashboard;
    state.participants = participants;
    state.spins = spins;
    state.audit = audit;
    state.draft = clone(editor.event);
    state.prizeUploadWarnings = {};
    state.prizeUploadDimensions = {};
    state.uploadingPrizeIndex = undefined;
    state.uploadingPrizeProgress = undefined;
    state.isBootstrapping = false;
    state.isSaving = false;
    render();
  } catch (error) {
    state.error = toErrorMessage(error);
    state.isBootstrapping = false;
    state.isSaving = false;
    render();
  }
}

async function refreshCurrentWorkspace() {
  if (!state.selectedEventId || state.isSaving) {
    return;
  }

  try {
    const [dashboard, participants, spins, audit] = await Promise.all([
      request<AdminEventDashboardResponse>(
        `/v2/admin/events/${encodeURIComponent(state.selectedEventId)}/dashboard?locale=${encodeURIComponent(state.locale)}`,
      ),
      request<AdminParticipantsResponse>(
        `/v2/admin/events/${encodeURIComponent(state.selectedEventId)}/participants?page=${state.participants?.page ?? 1}&pageSize=${state.participants?.pageSize ?? 12}`,
      ),
      request<AdminSpinRecordsResponse>(
        `/v2/admin/events/${encodeURIComponent(state.selectedEventId)}/spins?page=${state.spins?.page ?? 1}&pageSize=${state.spins?.pageSize ?? 12}`,
      ),
      request<AdminAuditLogResponse>(
        `/v2/admin/events/${encodeURIComponent(state.selectedEventId)}/audit?page=${state.audit?.page ?? 1}&pageSize=${state.audit?.pageSize ?? 12}`,
      ),
    ]);

    state.dashboard = dashboard;
    state.participants = participants;
    state.spins = spins;
    state.audit = audit;
    render();
  } catch {
    // keep stale workspace when background refresh fails
  }
}

function render() {
  const events = state.overview?.events ?? [];
  const selectedEvent =
    events.find((entry) => entry.id === state.selectedEventId) ?? events[0];
  const draft = state.draft;
  const localeContent = draft
    ? draft.localizations.find((entry) => entry.locale === state.selectedLocaleTab)
    : undefined;

  app.innerHTML = `
    <div class="admin-shell">
      <header class="topbar">
        <div class="topbar__brand">iBET</div>
        <div class="topbar__spacer"></div>
        <div class="topbar__locale">
          <label>
            <span>Locale</span>
            <select data-action="locale">
              ${SUPPORTED_LOCALES.map(
                (locale) => `<option value="${locale}" ${
                  state.locale === locale ? "selected" : ""
                }>${locale}</option>`,
              ).join("")}
            </select>
          </label>
        </div>
      </header>

      <div class="workspace">
        <aside class="sidebar">
          <div class="sidebar__header">
            <div>
              <div class="sidebar__eyebrow">Campaigns</div>
              <h2>Lucky Roulette Challenge</h2>
            </div>
            <button class="button button--success" data-action="create">Add</button>
          </div>
          <div class="event-list">
            ${events
              .map(
                (event) => `
                  <button class="event-card ${
                    event.id === selectedEvent?.id ? "event-card--active" : ""
                  }" data-action="select-event" data-event-id="${event.id}">
                    <div class="event-card__title">${escapeHtml(event.title)}</div>
                    <div class="event-card__meta">${escapeHtml(event.code)}</div>
                    <div class="event-card__footer">
                      <span class="status-pill status-pill--${event.status}">${event.status}</span>
                      <span>${escapeHtml(event.promotionPeriodLabel)}</span>
                    </div>
                  </button>
                `,
              )
              .join("")}
          </div>
        </aside>

        <main class="main">
          <section class="workspace-frame">
            <div class="workspace-frame__main">
              <section class="hero-card">
                <div class="hero-card__content">
                  <div class="hero-card__crumb">Lucky Roulette Challenge &gt; ${
                    selectedEvent ? escapeHtml(selectedEvent.title) : "Create"
                  }</div>
                  <h1>${localeContent ? escapeHtml(localeContent.title) : "Admin event setup"}</h1>
                  <p>
                    Configure event metadata, roulette segments, localized rules, prizes,
                    platform links, participants, spin logs, and audit actions in one workspace.
                  </p>
                  ${renderHeroMeta(selectedEvent)}
                  <div class="hero-card__actions">
                    <button class="button button--ghost" data-action="refresh">Refresh</button>
                    <button class="button button--primary" data-action="save">Save</button>
                    <button class="button button--accent" data-action="publish">Publish</button>
                    <button class="button button--danger" data-action="cancel">Cancel</button>
                  </div>
                </div>
              </section>

              <div class="section-strip section-strip--framed">
                ${SECTION_ORDER.map(
                  (section) => `
                    <button class="section-chip ${
                      state.activeSection === section ? "section-chip--active" : ""
                    }" data-action="section" data-section="${section}">
                      ${formatSectionLabel(section)}
                    </button>
                  `,
                ).join("")}
              </div>
            </div>

            <aside class="workspace-frame__side">
              ${renderEventSummaryCard(selectedEvent)}
            </aside>
          </section>

          ${renderToast()}
          ${state.error ? `<div class="error-banner">${escapeHtml(state.error)}</div>` : ""}

          <div class="content-grid">
            <section class="content-panel">
              ${renderActiveSection()}
            </section>
            <aside class="rail">
              ${renderMetricsRail()}
            </aside>
          </div>
        </main>
      </div>
    </div>
  `;

  bindEvents();
}

function renderActiveSection() {
  if (!state.draft) {
    return `<div class="empty-panel">Select an event to begin editing.</div>`;
  }

  switch (state.activeSection) {
    case "capital":
      return renderCapitalSection();
    case "roulette":
      return renderRouletteSection();
    case "prizes":
      return renderPrizeSection();
    case "terms":
      return renderTermsSection();
    case "links":
      return renderLinksSection();
    case "participants":
      return renderParticipantsSection();
    case "spins":
      return renderSpinsSection();
    case "audit":
      return renderAuditSection();
    default:
      return `<div class="empty-panel">Unknown section.</div>`;
  }
}

function renderCapitalSection() {
  const draft = state.draft!;

  return `
    <div class="card">
      <div class="card__header">
        <div>
          <div class="card__eyebrow">Capital Information</div>
          <h3>Event setup</h3>
        </div>
      </div>
      <div class="form-grid">
        <label class="field">
          <span>Activity Code</span>
          <input name="code" value="${escapeHtml(draft.code)}" />
        </label>
        <label class="field">
          <span>Site</span>
          <input name="siteCode" value="${escapeHtml(draft.siteCode)}" />
        </label>
        <label class="field">
          <span>Start Time</span>
          <input type="datetime-local" name="startAt" value="${toDatetimeLocal(draft.startAt)}" />
        </label>
        <label class="field">
          <span>End Time</span>
          <input type="datetime-local" name="endAt" value="${toDatetimeLocal(draft.endAt)}" />
        </label>
        <label class="field">
          <span>Status</span>
          <select name="status">
            ${Object.values(EventStatus)
              .map(
                (status) => `<option value="${status}" ${
                  draft.status === status ? "selected" : ""
                }>${status}</option>`,
              )
              .join("")}
          </select>
        </label>
        <label class="field">
          <span>Version / Theme</span>
          <select name="styleTheme">
            <option value="default" ${draft.styleTheme === "default" ? "selected" : ""}>Default</option>
          </select>
        </label>
        <label class="field">
          <span>Timezone</span>
          <input name="timezone" value="${escapeHtml(draft.timezone)}" />
        </label>
        <label class="field">
          <span>Countdown Ends</span>
          <input type="datetime-local" name="countdownEndsAt" value="${toDatetimeLocal(draft.countdownEndsAt)}" />
        </label>
      </div>
    </div>
  `;
}

function renderRouletteSection() {
  const draft = state.draft!;
  const locale = state.selectedLocaleTab;

  return `
    <div class="card">
      <div class="card__header">
        <div>
          <div class="card__eyebrow">Roulette Settings</div>
          <h3>Six fixed segments</h3>
        </div>
        <div class="weight-badge">Total ${draft.wheelSegments.reduce((sum, entry) => sum + entry.weightPercent, 0)}%</div>
      </div>
      <div class="locale-tabs">
        ${renderLocaleTabs()}
      </div>
      <div class="roulette-grid">
        ${draft.wheelSegments
          .map((segment, index) => {
            const translation = segment.localizations.find(
              (entry) => entry.locale === locale,
            );

            return `
              <article class="segment-card">
                <div class="segment-card__header">
                  <strong>Prize ${index + 1}</strong>
                  <span>Index ${segment.segmentIndex}</span>
                </div>
                <div class="segment-card__grid">
                  <label class="field">
                    <span>Label (${locale})</span>
                    <input data-segment-index="${index}" data-segment-field="label" value="${escapeHtml(translation?.label ?? "")}" />
                  </label>
                  <label class="field">
                    <span>Operator</span>
                    <select data-segment-index="${index}" data-segment-field="scoreOperator">
                      ${Object.values(WheelSegmentOperator)
                        .map(
                          (value) => `<option value="${value}" ${
                            segment.scoreOperator === value ? "selected" : ""
                          }>${value}</option>`,
                        )
                        .join("")}
                    </select>
                  </label>
                  <label class="field">
                    <span>Operand</span>
                    <input type="number" data-segment-index="${index}" data-segment-field="scoreOperand" value="${segment.scoreOperand}" />
                  </label>
                  <label class="field">
                    <span>Probability</span>
                    <input type="number" data-segment-index="${index}" data-segment-field="weightPercent" value="${segment.weightPercent}" />
                  </label>
                  <label class="field field--full">
                    <span>Display Asset Key</span>
                    <input data-segment-index="${index}" data-segment-field="displayAssetKey" value="${escapeHtml(segment.displayAssetKey)}" />
                  </label>
                </div>
              </article>
            `;
          })
          .join("")}
      </div>
    </div>
  `;
}

function renderPrizeSection() {
  const draft = state.draft!;
  const locale = state.selectedLocaleTab;

  return `
    <div class="card">
      <div class="card__header">
        <div>
          <div class="card__eyebrow">Prize Setting</div>
          <h3>Localized prize ladder</h3>
        </div>
        <button class="button button--success" data-action="add-prize">Add</button>
      </div>
      <div class="locale-tabs">
        ${renderLocaleTabs()}
      </div>
      <div class="table-wrap">
        <table class="admin-table">
          <thead>
            <tr>
              <th>No.</th>
              <th>Rank</th>
              <th>Prize Name (${locale})</th>
              <th>Description (${locale})</th>
              <th>Accent</th>
                    <th>Prize Image</th>
              <th>Sort</th>
              <th>Setting</th>
            </tr>
          </thead>
          <tbody>
            ${draft.prizes
              .map((prize, index) => {
                const translation = prize.localizations.find(
                  (entry) => entry.locale === locale,
                );

                return `
                  <tr>
                    <td>${index + 1}</td>
                    <td class="rank-cell">
                      <input type="number" data-prize-index="${index}" data-prize-field="rankFrom" value="${prize.rankFrom}" />
                      <span>to</span>
                      <input type="number" data-prize-index="${index}" data-prize-field="rankTo" value="${prize.rankTo}" />
                    </td>
                    <td><input data-prize-index="${index}" data-prize-field="prizeLabel" value="${escapeHtml(translation?.prizeLabel ?? "")}" /></td>
                    <td><textarea data-prize-index="${index}" data-prize-field="prizeDescription">${escapeHtml(translation?.prizeDescription ?? "")}</textarea></td>
                    <td><input data-prize-index="${index}" data-prize-field="accentLabel" value="${escapeHtml(translation?.accentLabel ?? "")}" /></td>
                    <td>
                      <div class="prize-upload">
                        <div class="prize-upload__preview">
                          ${
                            prize.imageUrl
                              ? `<img class="prize-upload__preview-image" src="${escapeAttribute(prize.imageUrl)}" alt="Prize preview ${index + 1}" />`
                              : `<div class="prize-upload__preview-empty">No image</div>`
                          }
                        </div>
                        <div class="prize-upload__actions">
                          <button class="text-button" data-action="upload-prize-image" data-prize-index="${index}" ${
                            state.uploadingPrizeIndex === index ? "disabled" : ""
                          }>
                            ${state.uploadingPrizeIndex === index ? "Uploading..." : "Upload"}
                          </button>
                          <button class="text-button" data-action="clear-prize-image" data-prize-index="${index}" ${
                            !prize.imageUrl || state.uploadingPrizeIndex === index ? "disabled" : ""
                          }>
                            Remove
                          </button>
                        </div>
                        ${
                          state.uploadingPrizeIndex === index
                            ? `
                              <div class="prize-upload__status">Uploading ${Math.round(state.uploadingPrizeProgress ?? 0)}%</div>
                              <div class="prize-upload__progress">
                                <span style="width:${Math.max(4, Math.round(state.uploadingPrizeProgress ?? 0))}%"></span>
                              </div>
                            `
                            : ""
                        }
                        <div class="prize-upload__hint">
                          Recommended: ${PRIZE_IMAGE_RECOMMENDED_WIDTH}x${PRIZE_IMAGE_RECOMMENDED_HEIGHT}px, 3:2 landscape.
                          Minimum: ${PRIZE_IMAGE_MIN_WIDTH}x${PRIZE_IMAGE_MIN_HEIGHT}px.
                        </div>
                        ${
                          state.prizeUploadDimensions[index]
                            ? `<div class="prize-upload__meta">Selected: ${state.prizeUploadDimensions[index].width}x${state.prizeUploadDimensions[index].height}px (${formatAspectRatioLabel(state.prizeUploadDimensions[index].width, state.prizeUploadDimensions[index].height)})</div>`
                            : ""
                        }
                        ${
                          state.prizeUploadWarnings[index]
                            ? `<div class="prize-upload__warning">${escapeHtml(state.prizeUploadWarnings[index])}</div>`
                            : ""
                        }
                        <input class="prize-upload__input" type="file" accept="image/png,image/jpeg,image/webp" data-prize-upload-input="${index}" />
                        <input data-prize-index="${index}" data-prize-field="imageUrl" value="${escapeHtml(prize.imageUrl ?? "")}" placeholder="Uploaded image URL will appear here" />
                      </div>
                    </td>
                    <td><input type="number" data-prize-index="${index}" data-prize-field="displayOrder" value="${prize.displayOrder}" /></td>
                    <td><button class="text-button" data-action="remove-prize" data-prize-index="${index}">Remove</button></td>
                  </tr>
                `;
              })
              .join("")}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderTermsSection() {
  const draft = state.draft!;
  const localeContent = draft.localizations.find(
    (entry) => entry.locale === state.selectedLocaleTab,
  );

  return `
    <div class="card">
      <div class="card__header">
        <div>
          <div class="card__eyebrow">Rules</div>
          <h3>Terms & rules editor</h3>
        </div>
      </div>
      <div class="locale-tabs">
        ${renderLocaleTabs()}
      </div>
      <div class="form-grid">
        <label class="field field--full">
          <span>Activity Name (${state.selectedLocaleTab})</span>
          <input name="locale-title" value="${escapeHtml(localeContent?.title ?? "")}" />
        </label>
        <label class="field field--full">
          <span>Short Description (${state.selectedLocaleTab})</span>
          <textarea name="locale-shortDescription">${escapeHtml(localeContent?.shortDescription ?? "")}</textarea>
        </label>
        <label class="field field--full">
          <span>Promotion Period Label (${state.selectedLocaleTab})</span>
          <input name="locale-promotionPeriodLabel" value="${escapeHtml(localeContent?.promotionPeriodLabel ?? "")}" />
        </label>
      </div>
      <div class="editor-toolbar">
        <span>Sans Serif</span>
        <span>Normal</span>
        <button>B</button>
        <button>I</button>
        <button>U</button>
        <button>List</button>
        <button>1.</button>
        <button>Link</button>
      </div>
      <label class="field field--full">
        <span>Rules Content (${state.selectedLocaleTab})</span>
        <textarea class="rules-area" name="locale-rulesContent">${escapeHtml(localeContent?.rulesContent ?? "")}</textarea>
      </label>
    </div>
  `;
}

function renderLinksSection() {
  const draft = state.draft!;
  const locale = state.selectedLocaleTab;

  return `
    <div class="card">
      <div class="card__header">
        <div>
          <div class="card__eyebrow">Platform Links</div>
          <h3>Deposit & support actions</h3>
        </div>
      </div>
      <div class="locale-tabs">
        ${renderLocaleTabs()}
      </div>
      <div class="link-grid">
        ${draft.platformLinks
          .map((link, index) => {
            const translation = link.localizations.find((entry) => entry.locale === locale);
            return `
              <article class="link-card">
                <div class="link-card__type">${formatLinkType(link.type)}</div>
                <label class="field">
                  <span>Label (${locale})</span>
                  <input data-link-index="${index}" data-link-field="label" value="${escapeHtml(translation?.label ?? "")}" />
                </label>
                <label class="field">
                  <span>URL</span>
                  <input data-link-index="${index}" data-link-field="url" value="${escapeHtml(link.url)}" />
                </label>
                <label class="field">
                  <span>Display Order</span>
                  <input type="number" data-link-index="${index}" data-link-field="displayOrder" value="${link.displayOrder}" />
                </label>
              </article>
            `;
          })
          .join("")}
      </div>
    </div>
  `;
}

function renderParticipantsSection() {
  const participants = state.participants;

  if (!participants) {
    return `<div class="empty-panel">Participant data unavailable.</div>`;
  }

  return `
    <div class="card">
      <div class="card__header">
        <div>
          <div class="card__eyebrow">Participants</div>
          <h3>Event ranking inspection</h3>
        </div>
      </div>
      ${renderPager("participants", participants.page, participants.pageSize, participants.total)}
      <div class="table-wrap">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Player</th>
              <th>Total Score</th>
              <th>Has Spun</th>
              <th>Updated</th>
            </tr>
          </thead>
          <tbody>
            ${participants.items
              .map(
                (entry) => `
                  <tr>
                    <td>#${entry.rank ?? "-"}</td>
                    <td>${escapeHtml(entry.playerName)}</td>
                    <td>${formatNumber(entry.totalScore)}</td>
                    <td>${entry.hasSpun ? "Yes" : "No"}</td>
                    <td>${formatDateTime(entry.updatedAt)}</td>
                  </tr>
                `,
              )
              .join("")}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderSpinsSection() {
  const spins = state.spins;

  if (!spins) {
    return `<div class="empty-panel">Spin records unavailable.</div>`;
  }

  return `
    <div class="card">
      <div class="card__header">
        <div>
          <div class="card__eyebrow">Spin Records</div>
          <h3>Transaction history</h3>
        </div>
      </div>
      ${renderPager("spins", spins.page, spins.pageSize, spins.total)}
      <div class="table-wrap">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Time</th>
              <th>Player</th>
              <th>Segment</th>
              <th>Delta</th>
              <th>Total</th>
              <th>Reward</th>
            </tr>
          </thead>
          <tbody>
            ${spins.items
              .map(
                (entry) => `
                  <tr>
                    <td>${formatDateTime(entry.createdAt)}</td>
                    <td>${escapeHtml(entry.playerName)}</td>
                    <td>${escapeHtml(entry.segmentLabel)}</td>
                    <td>${entry.scoreDelta >= 0 ? "+" : ""}${formatNumber(entry.scoreDelta)}</td>
                    <td>${formatNumber(entry.runningEventTotal)}</td>
                    <td>${escapeHtml(entry.rewardType)} ${
                      entry.rewardValue !== null && entry.rewardValue !== undefined
                        ? `(${escapeHtml(String(entry.rewardValue))})`
                        : ""
                    }</td>
                  </tr>
                `,
              )
              .join("")}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderAuditSection() {
  const audit = state.audit;

  if (!audit) {
    return `<div class="empty-panel">Audit history unavailable.</div>`;
  }

  return `
    <div class="card">
      <div class="card__header">
        <div>
          <div class="card__eyebrow">Audit Log</div>
          <h3>Operational history</h3>
        </div>
      </div>
      ${renderPager("audit", audit.page, audit.pageSize, audit.total)}
      <div class="audit-list">
        ${audit.items
          .map(
            (entry) => `
              <article class="audit-item">
                <div class="audit-item__time">${formatDateTime(entry.createdAt)}</div>
                <div>
                  <div class="audit-item__action">${escapeHtml(entry.action)}</div>
                  <div class="audit-item__summary">${escapeHtml(entry.summary)}</div>
                </div>
              </article>
            `,
          )
          .join("")}
      </div>
    </div>
  `;
}

function renderHeroMeta(selectedEvent?: AdminOverviewResponse["events"][number]) {
  const coverage = state.editor?.localizationCoverage ?? [];
  const readyLocales = coverage.filter(
    (entry) =>
      entry.eventContentComplete &&
      entry.prizeContentComplete &&
      entry.wheelLabelsComplete &&
      entry.platformLinksComplete,
  ).length;

  return `
    <div class="hero-meta">
      <span class="meta-pill">Site ${escapeHtml(state.draft?.siteCode ?? "iBET")}</span>
      <span class="meta-pill meta-pill--status">${selectedEvent?.status ?? "-"}</span>
      <span class="meta-pill">${escapeHtml(selectedEvent?.promotionPeriodLabel ?? "Unscheduled period")}</span>
      <span class="meta-pill">Locales ${readyLocales}/${coverage.length || 3} ready</span>
    </div>
  `;
}

function renderEventSummaryCard(selectedEvent?: AdminOverviewResponse["events"][number]) {
  const metrics = state.editor?.metrics ?? state.dashboard?.metrics;

  return `
    <div class="rail-card rail-card--summary">
      <div class="rail-card__eyebrow">Event Summary</div>
      <h4>${selectedEvent ? escapeHtml(selectedEvent.code) : "No event"}</h4>
      <div class="metric-list">
        <div><span>Status</span><strong>${selectedEvent?.status ?? "-"}</strong></div>
        <div><span>Participants</span><strong>${formatNumber(metrics?.participantCount ?? 0)}</strong></div>
        <div><span>Total Spins</span><strong>${formatNumber(metrics?.totalSpins ?? 0)}</strong></div>
        <div><span>Top Score</span><strong>${formatNumber(metrics?.topScore ?? 0)}</strong></div>
        <div><span>Average</span><strong>${formatNumber(metrics?.averageScore ?? 0)}</strong></div>
      </div>
    </div>
  `;
}

function renderMetricsRail() {
  const topFive = state.dashboard?.leaderboard.leaderboard.slice(0, 5) ?? [];

  return `
    <div class="rail-card">
      <div class="rail-card__eyebrow">Top 5 Snapshot</div>
      <div class="leader-snaps">
        ${topFive
          .map(
            (entry) => `
              <div class="leader-snap">
                <span>#${entry.rank}</span>
                <strong>${escapeHtml(entry.playerName)}</strong>
                <span>${formatNumber(entry.score)}</span>
              </div>
            `,
          )
          .join("")}
      </div>
    </div>
  `;
}

function renderLocaleTabs() {
  return SUPPORTED_LOCALES.map(
    (locale) => `
      <button class="locale-tab ${
        state.selectedLocaleTab === locale ? "locale-tab--active" : ""
      }" data-action="locale-tab" data-locale="${locale}">
        ${locale}
      </button>
    `,
  ).join("");
}

function renderPager(
  kind: "participants" | "spins" | "audit",
  page: number,
  pageSize: number,
  total: number,
) {
  const totalPages = Math.max(Math.ceil(total / pageSize), 1);

  return `
    <div class="pager">
      <button class="button button--ghost" data-action="page" data-kind="${kind}" data-page="${Math.max(page - 1, 1)}" ${
        page <= 1 ? "disabled" : ""
      }>Prev</button>
      <span>Page ${page} / ${totalPages}</span>
      <button class="button button--ghost" data-action="page" data-kind="${kind}" data-page="${Math.min(page + 1, totalPages)}" ${
        page >= totalPages ? "disabled" : ""
      }>Next</button>
    </div>
  `;
}

function renderToast() {
  if (!state.toast) {
    return "";
  }

  return `<div class="toast toast--${state.toast.tone}">${escapeHtml(state.toast.message)}</div>`;
}

function bindEvents() {
  app.querySelectorAll<HTMLElement>("[data-action]").forEach((element) => {
    element.addEventListener("click", handleActionClick);
  });

  app.querySelectorAll<HTMLInputElement>("[data-prize-upload-input]").forEach((element) => {
    element.addEventListener("change", handlePrizeUploadChange);
  });

  app.querySelector<HTMLSelectElement>('[data-action="locale"]')?.addEventListener("change", async (event) => {
    syncDraftFromDom();
    state.locale = (event.currentTarget as HTMLSelectElement).value as AppLocale;
    await loadOverview(true);
  });
}

async function handleActionClick(event: Event) {
  const target = event.currentTarget as HTMLElement;
  const action = target.dataset.action;

  switch (action) {
    case "refresh":
      await refreshCurrentWorkspace();
      return;
    case "select-event":
      syncDraftFromDom();
      await loadEventWorkspace(target.dataset.eventId ?? "");
      return;
    case "section":
      syncDraftFromDom();
      state.activeSection = (target.dataset.section as AdminSection) ?? "capital";
      render();
      return;
    case "locale-tab":
      syncDraftFromDom();
      state.selectedLocaleTab = (target.dataset.locale as AppLocale) ?? "en";
      render();
      return;
    case "add-prize":
      syncDraftFromDom();
      addPrizeRow();
      render();
      return;
    case "remove-prize":
      syncDraftFromDom();
      removePrizeRow(Number(target.dataset.prizeIndex));
      render();
      return;
    case "upload-prize-image":
      app
        .querySelector<HTMLInputElement>(
          `[data-prize-upload-input="${target.dataset.prizeIndex ?? ""}"]`,
        )
        ?.click();
      return;
    case "clear-prize-image":
      syncDraftFromDom();
      await clearPrizeImage(Number(target.dataset.prizeIndex));
      return;
    case "save":
      await saveDraft();
      return;
    case "publish":
      await runEventAction("publish");
      return;
    case "cancel":
      await runEventAction("cancel");
      return;
    case "create":
      await createNewEventFromTemplate();
      return;
    case "page":
      await loadPagedResource(
        target.dataset.kind as "participants" | "spins" | "audit",
        Number(target.dataset.page),
      );
      return;
    default:
      return;
  }
}

async function handlePrizeUploadChange(event: Event) {
  const input = event.currentTarget as HTMLInputElement;
  const prizeIndex = Number(input.dataset.prizeUploadInput);
  const file = input.files?.[0];

  if (!Number.isInteger(prizeIndex) || prizeIndex < 0 || !file) {
    return;
  }

  await uploadPrizeImage(prizeIndex, file);
  input.value = "";
}

function syncDraftFromDom() {
  if (!state.draft) {
    return;
  }

  const draft = state.draft;
  const localeContent = draft.localizations.find(
    (entry) => entry.locale === state.selectedLocaleTab,
  );

  draft.code = getInputValue("code", draft.code);
  draft.siteCode = getInputValue("siteCode", draft.siteCode);
  draft.status = getSelectValue("status", draft.status) as EventStatus;
  draft.timezone = getInputValue("timezone", draft.timezone);
  draft.styleTheme = getSelectValue("styleTheme", draft.styleTheme);
  draft.startAt = fromDatetimeLocal(getInputValue("startAt", toDatetimeLocal(draft.startAt)), draft.startAt);
  draft.endAt = fromDatetimeLocal(getInputValue("endAt", toDatetimeLocal(draft.endAt)), draft.endAt);
  draft.countdownEndsAt = fromDatetimeLocal(
    getInputValue("countdownEndsAt", toDatetimeLocal(draft.countdownEndsAt)),
    draft.countdownEndsAt,
  );

  if (localeContent) {
    localeContent.title = getInputValue("locale-title", localeContent.title);
    localeContent.shortDescription = getTextareaValue(
      "locale-shortDescription",
      localeContent.shortDescription,
    );
    localeContent.promotionPeriodLabel = getInputValue(
      "locale-promotionPeriodLabel",
      localeContent.promotionPeriodLabel,
    );
    localeContent.rulesContent = getTextareaValue(
      "locale-rulesContent",
      localeContent.rulesContent,
    );
  }

  app.querySelectorAll<HTMLInputElement | HTMLSelectElement>(
    "[data-segment-index]",
  ).forEach((element) => {
    const index = Number(element.dataset.segmentIndex);
    const field = element.dataset.segmentField;
    const segment = draft.wheelSegments[index];
    if (!segment || !field) {
      return;
    }

    if (field === "label") {
      const translation = segment.localizations.find(
        (entry) => entry.locale === state.selectedLocaleTab,
      );
      if (translation) {
        translation.label = element.value;
      }
      return;
    }

    switch (field) {
      case "scoreOperator":
        segment.scoreOperator = (element as HTMLSelectElement).value as WheelSegmentOperator;
        break;
      case "scoreOperand":
        segment.scoreOperand = Number(element.value) || 0;
        break;
      case "weightPercent":
        segment.weightPercent = Number(element.value) || 0;
        break;
      case "displayAssetKey":
        segment.displayAssetKey = element.value;
        break;
      default:
        break;
    }
  });

  app.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(
    "[data-prize-index]",
  ).forEach((element) => {
    const index = Number(element.dataset.prizeIndex);
    const field = element.dataset.prizeField;
    const prize = draft.prizes[index];
    if (!prize || !field) {
      return;
    }

    const translation = prize.localizations.find(
      (entry) => entry.locale === state.selectedLocaleTab,
    );

    switch (field) {
      case "rankFrom":
        prize.rankFrom = Number((element as HTMLInputElement).value) || 0;
        break;
      case "rankTo":
        prize.rankTo = Number((element as HTMLInputElement).value) || 0;
        break;
      case "displayOrder":
        prize.displayOrder = Number((element as HTMLInputElement).value) || 0;
        break;
      case "imageUrl":
        prize.imageUrl = (element as HTMLInputElement).value || null;
        break;
      case "prizeLabel":
        if (translation) {
          translation.prizeLabel = element.value;
        }
        break;
      case "prizeDescription":
        if (translation) {
          translation.prizeDescription = element.value;
        }
        break;
      case "accentLabel":
        if (translation) {
          translation.accentLabel = element.value || null;
        }
        break;
      default:
        break;
    }
  });

  app.querySelectorAll<HTMLInputElement>("[data-link-index]").forEach((element) => {
    const index = Number(element.dataset.linkIndex);
    const field = element.dataset.linkField;
    const link = draft.platformLinks[index];
    if (!link || !field) {
      return;
    }

    if (field === "url") {
      link.url = element.value;
      return;
    }

    if (field === "displayOrder") {
      link.displayOrder = Number(element.value) || 0;
      return;
    }

    if (field === "label") {
      const translation = link.localizations.find(
        (entry) => entry.locale === state.selectedLocaleTab,
      );
      if (translation) {
        translation.label = element.value;
      }
    }
  });
}

async function createNewEventFromTemplate() {
  syncDraftFromDom();
  const template = buildTemplateRequest();
  state.isSaving = true;
  render();

  try {
    const editor = await request<AdminEventEditorResponse>(
      `/v2/admin/events?locale=${encodeURIComponent(state.locale)}`,
      {
        method: "POST",
        body: JSON.stringify(template),
      },
    );

    state.toast = {
      tone: "success",
      message: "Draft event created.",
    };
    await loadOverview(false);
    await loadEventWorkspace(editor.event.id);
  } catch (error) {
    state.toast = {
      tone: "error",
      message: toErrorMessage(error),
    };
    state.isSaving = false;
    render();
  }
}

async function saveDraft() {
  if (!state.draft || !state.selectedEventId) {
    return;
  }

  if (state.uploadingPrizeIndex !== undefined) {
    state.toast = {
      tone: "error",
      message: "Wait for the current image upload to finish before saving.",
    };
    render();
    return;
  }

  syncDraftFromDom();
  state.isSaving = true;
  render();

  try {
    const saveTarget = getSaveTarget(state.draft, state.activeSection);
    await request<AdminEventEditorResponse>(
      `/v2/admin/events/${encodeURIComponent(state.selectedEventId)}${saveTarget.pathname}?locale=${encodeURIComponent(state.locale)}`,
      {
        method: "PATCH",
        body: JSON.stringify(saveTarget.body),
      },
    );
    state.toast = {
      tone: "success",
      message: saveTarget.successMessage,
    };
    await loadOverview(false);
    await loadEventWorkspace(state.selectedEventId);
  } catch (error) {
    state.toast = {
      tone: "error",
      message: toErrorMessage(error),
    };
    state.isSaving = false;
    render();
  }
}

async function runEventAction(action: "publish" | "cancel") {
  if (!state.selectedEventId) {
    return;
  }

  syncDraftFromDom();
  state.isSaving = true;
  render();

  try {
    await request<AdminEventEditorResponse>(
      `/v2/admin/events/${encodeURIComponent(state.selectedEventId)}/${action}?locale=${encodeURIComponent(state.locale)}`,
      {
        method: "POST",
      },
    );
    state.toast = {
      tone: "success",
      message: `Event ${action} completed.`,
    };
    await loadOverview(false);
    await loadEventWorkspace(state.selectedEventId);
  } catch (error) {
    state.toast = {
      tone: "error",
      message: toErrorMessage(error),
    };
    state.isSaving = false;
    render();
  }
}

async function loadPagedResource(
  kind: "participants" | "spins" | "audit",
  page: number,
) {
  if (!state.selectedEventId) {
    return;
  }

  const pageSize =
    kind === "participants"
      ? state.participants?.pageSize ?? 12
      : kind === "spins"
        ? state.spins?.pageSize ?? 12
        : state.audit?.pageSize ?? 12;

  const response = await request<
    | AdminParticipantsResponse
    | AdminSpinRecordsResponse
    | AdminAuditLogResponse
  >(
    `/v2/admin/events/${encodeURIComponent(state.selectedEventId)}/${kind}?page=${page}&pageSize=${pageSize}`,
  );

  if (kind === "participants") {
    state.participants = response as AdminParticipantsResponse;
  } else if (kind === "spins") {
    state.spins = response as AdminSpinRecordsResponse;
  } else {
    state.audit = response as AdminAuditLogResponse;
  }

  render();
}

async function uploadPrizeImage(prizeIndex: number, file: File) {
  if (!state.draft || !state.selectedEventId) {
    state.toast = {
      tone: "error",
      message: "Save or select an event before uploading images.",
    };
    render();
    return;
  }

  syncDraftFromDom();
  const prize = state.draft.prizes[prizeIndex];
  if (!prize) {
    return;
  }

  const dimensions = await readImageDimensions(file);
  state.prizeUploadDimensions[prizeIndex] = dimensions;
  const blockingError = getPrizeImageBlockingError(dimensions.width, dimensions.height);
  if (blockingError) {
    state.prizeUploadWarnings[prizeIndex] = blockingError;
    render();
    return;
  }

  const advisoryWarning = getPrizeImageAdvisoryWarning(dimensions.width, dimensions.height);
  if (advisoryWarning) {
    state.prizeUploadWarnings[prizeIndex] = advisoryWarning;
  } else {
    delete state.prizeUploadWarnings[prizeIndex];
  }

  state.uploadingPrizeIndex = prizeIndex;
  state.uploadingPrizeProgress = 0;
  render();

  try {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("prizeId", prize.id);
    formData.append("oldImageUrl", prize.imageUrl ?? "");

    const response = await uploadMultipart<AdminPrizeImageUploadResponse>(
      `${API_BASE_URL}/v2/admin/uploads/events/${encodeURIComponent(state.selectedEventId)}/prize-image`,
      formData,
      (percent) => {
        state.uploadingPrizeProgress = percent;
        render();
      },
    );

    prize.imageUrl = response.publicUrl;
    state.prizeUploadDimensions[prizeIndex] = {
      width: response.width,
      height: response.height,
    };
    state.toast = {
      tone: "success",
      message: "Prize image uploaded.",
    };
  } catch (error) {
    state.prizeUploadWarnings[prizeIndex] = toErrorMessage(error);
    state.toast = {
      tone: "error",
      message: toErrorMessage(error),
    };
  } finally {
    state.uploadingPrizeIndex = undefined;
    state.uploadingPrizeProgress = undefined;
    render();
  }
}

async function clearPrizeImage(index: number) {
  if (!state.draft) {
    return;
  }

  const prize = state.draft.prizes[index];
  if (!prize) {
    return;
  }

  const imageUrl = prize.imageUrl;
  prize.imageUrl = null;
  delete state.prizeUploadWarnings[index];
  delete state.prizeUploadDimensions[index];

  if (!imageUrl) {
    render();
    return;
  }

  try {
    await request<AdminUploadedImageDeleteResponse>("/v2/admin/uploads", {
      method: "DELETE",
      body: JSON.stringify({ imageUrl }),
    });
    state.toast = {
      tone: "success",
      message: "Prize image removed.",
    };
  } catch (error) {
    state.toast = {
      tone: "error",
      message: toErrorMessage(error),
    };
  }

  render();
}

function getPrizeImageBlockingError(width: number, height: number) {
  if (width < PRIZE_IMAGE_MIN_WIDTH || height < PRIZE_IMAGE_MIN_HEIGHT) {
    return `Image is too small. Minimum size is ${PRIZE_IMAGE_MIN_WIDTH}x${PRIZE_IMAGE_MIN_HEIGHT}px.`;
  }

  const aspectRatio = width / height;
  if (aspectRatio < PRIZE_IMAGE_MIN_ASPECT_RATIO || aspectRatio > PRIZE_IMAGE_MAX_ASPECT_RATIO) {
    return "Image must be landscape oriented. Use an aspect ratio close to 3:2 or 16:10.";
  }

  return null;
}

function getPrizeImageAdvisoryWarning(width: number, height: number) {
  if (width < PRIZE_IMAGE_RECOMMENDED_WIDTH || height < PRIZE_IMAGE_RECOMMENDED_HEIGHT) {
    return `Image is valid, but ${PRIZE_IMAGE_RECOMMENDED_WIDTH}x${PRIZE_IMAGE_RECOMMENDED_HEIGHT}px (3:2) is recommended for best clarity.`;
  }

  return "";
}

function formatAspectRatioLabel(width: number, height: number) {
  if (!width || !height) {
    return "-";
  }

  const gcd = getGreatestCommonDivisor(width, height);
  const reducedWidth = width / gcd;
  const reducedHeight = height / gcd;

  if (reducedWidth <= 20 && reducedHeight <= 20) {
    return `${reducedWidth}:${reducedHeight}`;
  }

  return `${(width / height).toFixed(2)}:1`;
}

function getGreatestCommonDivisor(left: number, right: number): number {
  let a = Math.abs(Math.round(left));
  let b = Math.abs(Math.round(right));

  while (b !== 0) {
    const remainder = a % b;
    a = b;
    b = remainder;
  }

  return a || 1;
}

function addPrizeRow() {
  if (!state.draft) {
    return;
  }

  const nextIndex = state.draft.prizes.length + 1;
  state.draft.prizes.push({
    id: `draft-prize-${nextIndex}`,
    rankFrom: nextIndex,
    rankTo: nextIndex,
    imageUrl: null,
    displayOrder: nextIndex,
    localizations: SUPPORTED_LOCALES.map((locale) => ({
      locale,
      prizeLabel: "",
      prizeDescription: "",
      accentLabel: null,
    })),
  });
  state.prizeUploadWarnings = {};
  state.prizeUploadDimensions = {};
}

function removePrizeRow(index: number) {
  if (!state.draft) {
    return;
  }

  state.draft.prizes.splice(index, 1);
  state.draft.prizes.forEach((entry, prizeIndex) => {
    entry.displayOrder = prizeIndex + 1;
  });
  state.prizeUploadWarnings = {};
  state.prizeUploadDimensions = {};
}

function buildTemplateRequest(): AdminEventUpsertRequest {
  const source = state.draft ?? buildFallbackDraft();
  const nextMonthStart = new Date();
  nextMonthStart.setDate(nextMonthStart.getDate() + 7);
  const nextMonthEnd = new Date(nextMonthStart);
  nextMonthEnd.setDate(nextMonthStart.getDate() + 29);

  const template = clone(source);
  template.code = `${template.code}-COPY-${String(Date.now()).slice(-4)}`;
  template.status = EventStatus.Draft;
  template.startAt = nextMonthStart.toISOString();
  template.endAt = nextMonthEnd.toISOString();
  template.countdownEndsAt = nextMonthEnd.toISOString();
  template.localizations = template.localizations.map((entry) => ({
    ...entry,
    title: `${entry.title} Copy`,
  }));

  return buildUpsertRequest(template);
}

function buildFallbackDraft(): AdminEventConfigDto {
  return {
    id: "draft-template",
    code: "LUCKY-WHEEL-DRAFT",
    siteCode: "iBET",
    status: EventStatus.Draft,
    timezone: "GMT+8",
    styleTheme: "default",
    startAt: new Date().toISOString(),
    endAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    countdownEndsAt: new Date(
      Date.now() + 14 * 24 * 60 * 60 * 1000,
    ).toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    localizations: SUPPORTED_LOCALES.map((locale) => ({
      locale,
      title: locale === "en" ? "Lucky Wheel Draft" : "",
      shortDescription: "",
      rulesContent: "",
      promotionPeriodLabel: "",
    })),
    wheelSegments: Array.from({ length: 6 }, (_, index) => ({
      id: `draft-segment-${index}`,
      segmentIndex: index,
      scoreOperator: index === 0 ? WheelSegmentOperator.Add : WheelSegmentOperator.Equals,
      scoreOperand: index === 0 ? 40 : 0,
      weightPercent: index < 4 ? 20 : 10,
      displayAssetKey: `draft-segment-${index}`,
      localizations: SUPPORTED_LOCALES.map((locale) => ({
        locale,
        label: "",
      })),
    })),
    prizes: [
      {
        id: "draft-prize-1",
        rankFrom: 1,
        rankTo: 1,
        imageUrl: null,
        displayOrder: 1,
        localizations: SUPPORTED_LOCALES.map((locale) => ({
          locale,
          prizeLabel: "",
          prizeDescription: "",
          accentLabel: "",
        })),
      },
    ],
    platformLinks: [
      {
        id: "draft-link-deposit",
        type: PlatformLinkType.Deposit,
        url: "",
        displayOrder: 1,
        localizations: SUPPORTED_LOCALES.map((locale) => ({
          locale,
          label: "",
        })),
      },
      {
        id: "draft-link-support",
        type: PlatformLinkType.CustomerService,
        url: "",
        displayOrder: 2,
        localizations: SUPPORTED_LOCALES.map((locale) => ({
          locale,
          label: "",
        })),
      },
    ],
  };
}

function buildUpsertRequest(draft: AdminEventConfigDto): AdminEventUpsertRequest {
  return {
    code: draft.code,
    siteCode: draft.siteCode,
    status: draft.status,
    timezone: draft.timezone,
    styleTheme: draft.styleTheme,
    startAt: draft.startAt,
    endAt: draft.endAt,
    countdownEndsAt: draft.countdownEndsAt,
    localizations: clone(draft.localizations),
    wheelSegments: draft.wheelSegments.map((entry) => ({
      segmentIndex: entry.segmentIndex,
      scoreOperator: entry.scoreOperator,
      scoreOperand: entry.scoreOperand,
      weightPercent: entry.weightPercent,
      displayAssetKey: entry.displayAssetKey,
      localizations: clone(entry.localizations),
    })),
    prizes: draft.prizes.map((entry) => ({
      rankFrom: entry.rankFrom,
      rankTo: entry.rankTo,
      imageUrl: entry.imageUrl,
      displayOrder: entry.displayOrder,
      localizations: clone(entry.localizations),
    })),
    platformLinks: draft.platformLinks.map((entry) => ({
      type: entry.type,
      url: entry.url,
      displayOrder: entry.displayOrder,
      localizations: clone(entry.localizations),
    })),
  };
}

function buildTermsUpdateRequest(draft: AdminEventConfigDto): AdminEventTermsUpdateRequest {
  return {
    localizations: clone(draft.localizations),
  };
}

function buildPlatformLinksUpdateRequest(
  draft: AdminEventConfigDto,
): AdminPlatformLinksUpdateRequest {
  return {
    platformLinks: draft.platformLinks.map((entry) => ({
      type: entry.type,
      url: entry.url,
      displayOrder: entry.displayOrder,
      localizations: clone(entry.localizations),
    })),
  };
}

function getSaveTarget(draft: AdminEventConfigDto, section: AdminSection) {
  switch (section) {
    case "terms":
      return {
        pathname: "/terms",
        body: buildTermsUpdateRequest(draft),
        successMessage: "Terms & rules saved.",
      };
    case "links":
      return {
        pathname: "/platform-links",
        body: buildPlatformLinksUpdateRequest(draft),
        successMessage: "Platform links saved.",
      };
    default:
      return {
        pathname: "",
        body: buildUpsertRequest(draft),
        successMessage: "Event saved.",
      };
  }
}

async function request<T>(pathname: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers ?? {});
  if (!(init?.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_BASE_URL}${pathname}`, {
    headers,
    ...init,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed with status ${response.status}`);
  }

  return (await response.json()) as T;
}

function uploadMultipart<T>(
  url: string,
  formData: FormData,
  onProgress: (percent: number) => void,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) {
        return;
      }

      onProgress((event.loaded / event.total) * 100);
    };

    xhr.onload = () => {
      if (xhr.status < 200 || xhr.status >= 300) {
        reject(new Error(xhr.responseText || `Request failed with status ${xhr.status}`));
        return;
      }

      try {
        resolve(JSON.parse(xhr.responseText) as T);
      } catch (error) {
        reject(error);
      }
    };

    xhr.onerror = () => {
      reject(new Error("Upload failed."));
    };

    xhr.send(formData);
  });
}

function readImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      resolve({ width: image.naturalWidth, height: image.naturalHeight });
      URL.revokeObjectURL(objectUrl);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Unable to read image dimensions."));
    };
    image.src = objectUrl;
  });
}

function getInputValue(name: string, fallback: string) {
  return app.querySelector<HTMLInputElement>(`[name="${name}"]`)?.value ?? fallback;
}

function getSelectValue(name: string, fallback: string) {
  return app.querySelector<HTMLSelectElement>(`[name="${name}"]`)?.value ?? fallback;
}

function getTextareaValue(name: string, fallback: string) {
  return app.querySelector<HTMLTextAreaElement>(`[name="${name}"]`)?.value ?? fallback;
}

function toDatetimeLocal(value: string) {
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 16);
}

function fromDatetimeLocal(value: string, fallback: string) {
  return value ? new Date(value).toISOString() : fallback;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function formatSectionLabel(section: AdminSection) {
  switch (section) {
    case "capital":
      return "Capital Information";
    case "roulette":
      return "Roulette";
    case "prizes":
      return "Prize Setting";
    case "terms":
      return "Terms & Rules";
    case "links":
      return "Platform Links";
    case "participants":
      return "Participants";
    case "spins":
      return "Spin Records";
    case "audit":
      return "Audit";
  }
}

function formatLinkType(type: PlatformLinkType) {
  return type === PlatformLinkType.Deposit ? "Deposit" : "Customer Service";
}

function formatSourceLabel(source: string) {
  switch (source) {
    case "lucky_wheel_server":
      return "Lucky Wheel Server";
    case "archive_snapshot":
      return "Archive Snapshot";
    default:
      return source;
  }
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeAttribute(value: string) {
  return escapeHtml(value);
}

function toErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unexpected admin tool error.";
}

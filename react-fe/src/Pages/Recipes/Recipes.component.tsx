import { useEffect, useMemo, useState } from "react";

import { apiService } from "../../services/api.service";
import type {
  Ingredient,
  RecipeMatch,
  RecipesPayload,
} from "../../services/recipes.types";
import {
  HAVE_STORAGE_KEY,
  allTicked,
  bulkLabel,
  featuredLine,
  filterIngredients,
  formatList,
  groupProgress,
  labelFor,
  missingNote,
  pantryState,
  parseSelection,
  serializeSelection,
  summaryLine,
  swapNote,
  tickAll,
  toggleId,
} from "./recipes.utils";
import "./Recipes.scss";

/** The ticked pantry survives a reload — it is a standing fact about the house. */
const loadSelection = (): string[] => {
  // `window` is undefined during the build-time prerender of the other routes.
  if (typeof window === "undefined") return [];
  try {
    return parseSelection(localStorage.getItem(HAVE_STORAGE_KEY));
  } catch {
    return [];
  }
};

const saveSelection = (ids: string[]): void => {
  try {
    localStorage.setItem(HAVE_STORAGE_KEY, serializeSelection(ids));
  } catch {
    // Private mode / storage disabled: the page still works, it just forgets.
  }
};

const RecipeCard = ({
  match,
  ingredients,
}: {
  match: RecipeMatch;
  ingredients: Ingredient[];
}) => {
  const { recipe } = match;
  const missing = missingNote(match, ingredients);
  // Two or more short: this card is on the browse list, not the promise list.
  const far = match.missing.length > 1;

  return (
    <li
      className={`rc-card${match.cookable ? " rc-card--ready" : ""}${
        far ? " rc-card--far" : ""
      }`}
    >
      <div className="rc-card-head">
        <h3>{recipe.title}</h3>
        <span className={`rc-badge${match.cookable ? " rc-badge--ready" : ""}`}>
          {match.cookable ? "cook it now" : missing}
        </span>
      </div>

      <p className="rc-blurb">{recipe.blurb}</p>
      <p className="rc-meta">
        {recipe.minutes} min · {recipe.servings} · {recipe.tags.join(", ")}
      </p>

      {match.garden.length > 0 && (
        // Why this card is where it is: the ranking put picked garden first, so
        // the card names the crops that earned it.
        <p className="rc-also rc-also--garden">
          <span className="rc-also-label">from the garden</span>
          <span>
            {formatList(match.garden.map((id) => labelFor(ingredients, id)))}
          </span>
        </p>
      )}

      <ul className="rc-reqs">
        {match.required.map((item) => {
          const state = pantryState(item);
          const note = swapNote(item);
          return (
            <li key={item.id} className={`rc-req rc-req--${state}`}>
              <span className="rc-mark" aria-hidden="true">
                {state === "have" ? "✓" : state === "swap" ? "⇄" : "✗"}
              </span>
              <span className="rc-req-label">{item.label}</span>
              {note && <span className="rc-req-note">{note}</span>}
              <span className="rc-sr">
                {state === "have"
                  ? "in the house"
                  : state === "swap"
                    ? note
                    : "missing"}
              </span>
            </li>
          );
        })}
      </ul>

      {match.optional.length > 0 && (
        <p className="rc-also">
          <span className="rc-also-label">also nice</span>
          {match.optional.map((item) => (
            <span
              key={item.id}
              className={`rc-chip${item.have ? " rc-chip--have" : ""}`}
            >
              {item.label}
              <span className="rc-sr">
                {item.have ? " (in the house)" : " (not ticked)"}
              </span>
            </span>
          ))}
        </p>
      )}

      {recipe.seasonings && recipe.seasonings.length > 0 && (
        <p className="rc-also rc-also--seasoning">
          <span className="rc-also-label">plus</span>
          <span>{formatList(recipe.seasonings)}</span>
        </p>
      )}

      <ol className="rc-steps">
        {recipe.steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
    </li>
  );
};

/**
 * `/recipes` — what the garden and the cupboard can make together.
 *
 * One request per selection, debounced: the backend does the matching, and this
 * page only decides wording, so there is no second ranking implementation to
 * drift. The pantry list itself arrives with the same payload, which is why an
 * empty selection still fetches.
 */
const Recipes = () => {
  const [payload, setPayload] = useState<RecipesPayload | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [have, setHave] = useState<string[]>(loadSelection);
  const [query, setQuery] = useState("");

  useEffect(() => {
    saveSelection(have);

    let cancelled = false;
    // Ticking is instant but the fetch is not: without a beat, adding five
    // things fires five requests whose answers can land out of order.
    const timer = window.setTimeout(() => {
      apiService
        .getRecipes(have)
        .then((data) => {
          if (cancelled) return;
          setPayload(data);
          setStatus("ready");
        })
        .catch(() => {
          if (!cancelled) setStatus("error");
        });
    }, 150);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [have]);

  /**
   * Drop ids the catalogue no longer has (a renamed crop, an old stored list)
   * so the "3 ticked" count never includes something invisible. Returning the
   * same array when nothing changed keeps this from re-rendering forever.
   */
  useEffect(() => {
    if (!payload) return;
    const known = new Set(payload.ingredients.map((item) => item.id));
    setHave((current) => {
      const kept = current.filter((id) => known.has(id));
      return kept.length === current.length ? current : kept;
    });
  }, [payload]);

  const ingredients = useMemo(() => payload?.ingredients ?? [], [payload]);
  const visible = useMemo(
    () => filterIngredients(ingredients, query),
    [ingredients, query],
  );
  const garden = ingredients.filter((item) => item.group === "garden").length;
  const ticked = new Set(have);

  return (
    <div className="recipes">
      <header className="rc-head">
        <h1>recipes from the garden</h1>
        <p className="rc-sub">
          Tick what is in the house — or press <em>tick all</em> on the fridge
          and cupboard — and this lists what you can cook right now, then the
          recipes that are one ingredient short, then — further down —
          everything else that uses what you ticked. The garden list is the
          planting calendar&rsquo;s {garden || "own"} crops, so it moves with
          the season.
        </p>
      </header>

      {status === "error" && (
        <p className="rc-note rc-note--error" role="alert">
          Could not reach the kitchen — the last results are still below.
        </p>
      )}

      <div className="rc-body">
        <section className="rc-pantry" aria-label="What is in the house">
          <div className="rc-pantry-head">
            <h2>in the house</h2>
            <span className="rc-count">
              {have.length} ticked
              {payload ? ` of ${payload.ingredients.length}` : ""}
            </span>
            <button
              type="button"
              className="rc-clear"
              onClick={() => setHave([])}
              disabled={have.length === 0}
            >
              clear
            </button>
          </div>

          <label className="rc-search">
            <span className="rc-sr">Search the pantry</span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="search — tomato, eggs, basil…"
              autoComplete="off"
            />
          </label>

          {!payload && status === "loading" && (
            <p className="rc-note">reading the pantry…</p>
          )}

          {payload?.groups.map((group) => {
            const items = visible.filter((item) => item.group === group.id);
            if (items.length === 0) return null;
            // The bulk control always acts on the whole section, not on what a
            // search happens to be showing — the label carries the real count.
            const groupIds = ingredients
              .filter((item) => item.group === group.id)
              .map((item) => item.id);
            const wholeGroup = allTicked(groupIds, have);
            return (
              <section
                key={group.id}
                className={`rc-group rc-group--${group.id}`}
                aria-labelledby={`rc-group-${group.id}`}
              >
                <div className="rc-group-head">
                  <h3 id={`rc-group-${group.id}`}>
                    {group.label}
                    <span className="rc-group-count">
                      {groupProgress(group, ingredients, have)}
                    </span>
                  </h3>
                  {group.allAtOnce && (
                    <button
                      type="button"
                      className="rc-bulk"
                      onClick={() =>
                        setHave((current) =>
                          tickAll(current, groupIds, !wholeGroup),
                        )
                      }
                    >
                      {bulkLabel(groupIds.length, wholeGroup)}
                      <span className="rc-sr">
                        {wholeGroup
                          ? ` — empty the ${group.label} list`
                          : ` — assume everything in ${group.label}`}
                      </span>
                    </button>
                  )}
                </div>
                <p className="rc-group-blurb">{group.blurb}</p>
                <ul className="rc-ings">
                  {items.map((item) => (
                    <li key={item.id}>
                      <label
                        className={`rc-ing${ticked.has(item.id) ? " rc-ing--ticked" : ""}`}
                      >
                        <input
                          type="checkbox"
                          checked={ticked.has(item.id)}
                          onChange={() =>
                            setHave((current) => toggleId(current, item.id))
                          }
                        />
                        <span>{item.label}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}

          {payload && visible.length === 0 && (
            <p className="rc-note">
              nothing in the pantry matches “{query.trim()}”
            </p>
          )}

          {payload && (
            <p className="rc-staples">
              Always assumed: {formatList(payload.staples)}.
            </p>
          )}
        </section>

        <section className="rc-results" aria-label="What you could cook">
          <div className="rc-results-head">
            <h2>what you could cook</h2>
            {payload && have.length > 0 && (
              <p className="rc-count" aria-live="polite">
                {summaryLine(payload.counts)}
              </p>
            )}
          </div>

          {payload && have.length === 0 && (
            <p className="rc-note">
              Nothing ticked yet. Pick a handful of things — the garden list has
              everything the planting calendar grows.
            </p>
          )}

          {payload && have.length > 0 && payload.matches.length === 0 && (
            <p className="rc-note">
              {payload.featured.length > 0
                ? "Nothing in the catalogue is within one ingredient of that yet. Below are the recipes that use what you ticked — tick their missing bits to close the gap."
                : "Nothing in the catalogue is within one ingredient of that selection. Try something from the fridge or cupboard list — bread, eggs and cheese go a long way."}
            </p>
          )}

          {payload && have.length > 0 && payload.matches.length > 0 && (
            <ol className="rc-cards">
              {payload.matches.map((match) => (
                <RecipeCard
                  key={match.recipe.id}
                  match={match}
                  ingredients={ingredients}
                />
              ))}
            </ol>
          )}

          {payload && have.length > 0 && payload.featured.length > 0 && (
            <section className="rc-more" aria-labelledby="rc-more-head">
              <div className="rc-results-head">
                <h3 id="rc-more-head">more with what you ticked</h3>
                <p className="rc-count">{featuredLine(payload.counts)}</p>
              </div>
              <p className="rc-more-blurb">
                Not dinner tonight — but each of these uses something you have,
                and the ones that eat what you picked in the garden come first,
                then the closest. Tick a missing ingredient to pull it up.
              </p>
              <ol className="rc-cards">
                {payload.featured.map((match) => (
                  <RecipeCard
                    key={match.recipe.id}
                    match={match}
                    ingredients={ingredients}
                  />
                ))}
              </ol>
            </section>
          )}
        </section>
      </div>

      <footer className="rc-foot">
        <p>
          {payload
            ? `${payload.counts.catalog} recipes, matched against ${payload.ingredients.length} ingredients.`
            : "Loading the catalogue…"}{" "}
          Recipes are only promised when they need nothing at all, or exactly
          one more thing; the second list is a browse that uses what you ticked.
        </p>
      </footer>
    </div>
  );
};

export default Recipes;

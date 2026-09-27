import {
  useEffect,
  useState,
  type FormEvent,
} from "react";

import {
  Pencil,
  Star,
  Trash2,
} from "lucide-react";

import {
  Link,
} from "react-router-dom";

import {
  useAuth,
} from "../context/useAuth";

import {
  createReview,
  deleteReview,
  getProductReviews,
  getReviewSummary,
  updateReview,
} from "../services/reviewService";

import type {
  Review,
  ReviewSummary,
} from "../services/reviewService";

import "./ProductReviews.css";


type ProductReviewsProps = {
  productId: number;
};


const STAR_VALUES = [
  1,
  2,
  3,
  4,
  5,
];


function ProductReviews({
  productId,
}: ProductReviewsProps) {

  const {
    user,
    token,
    isAuthenticated,
  } = useAuth();


  // ==========================================
  // DATOS
  // ==========================================

  const [
    reviews,
    setReviews,
  ] = useState<Review[]>([]);


  const [
    summary,
    setSummary,
  ] = useState<ReviewSummary>({
    average_rating: 0,
    total_reviews: 0,
  });


  // ==========================================
  // ESTADOS
  // ==========================================

  const [
    loading,
    setLoading,
  ] = useState(true);


  const [
    submitting,
    setSubmitting,
  ] = useState(false);


  const [
    error,
    setError,
  ] = useState("");


  const [
    success,
    setSuccess,
  ] = useState("");


  // ==========================================
  // FORMULARIO
  // ==========================================

  const [
    rating,
    setRating,
  ] = useState(0);


  const [
    hoverRating,
    setHoverRating,
  ] = useState(0);


  const [
    comment,
    setComment,
  ] = useState("");


  const [
    editing,
    setEditing,
  ] = useState(false);


  // ==========================================
  // RESEÑA DEL USUARIO
  // ==========================================

  const userReview =
    user
      ? reviews.find(
          (review) =>
            review.user_id ===
            user.id
        )
      : undefined;


  // ==========================================
  // CARGAR INFORMACIÓN
  // ==========================================

  useEffect(() => {

    let cancelled = false;


    async function loadReviews() {

      try {

        setLoading(true);
        setError("");


        const [
          reviewsData,
          summaryData,
        ] = await Promise.all([
          getProductReviews(
            productId
          ),

          getReviewSummary(
            productId
          ),
        ]);


        if (cancelled) {
          return;
        }


        setReviews(
          reviewsData
        );


        setSummary(
          summaryData
        );

      } catch (
        requestError
      ) {

        console.error(
          "Error cargando reseñas:",
          requestError
        );


        if (!cancelled) {

          setError(
            "No se pudieron cargar las opiniones."
          );

        }

      } finally {

        if (!cancelled) {

          setLoading(
            false
          );

        }

      }

    }


    void loadReviews();


    return () => {

      cancelled = true;

    };

  }, [
    productId,
  ]);


  // ==========================================
  // ACTUALIZAR INFORMACIÓN
  // ==========================================

  async function refreshReviews() {

    const [
      reviewsData,
      summaryData,
    ] = await Promise.all([
      getProductReviews(
        productId
      ),

      getReviewSummary(
        productId
      ),
    ]);


    setReviews(
      reviewsData
    );


    setSummary(
      summaryData
    );

  }


  // ==========================================
  // REINICIAR FORMULARIO
  // ==========================================

  function resetForm() {

    setRating(0);

    setHoverRating(0);

    setComment("");

    setEditing(false);

  }


  // ==========================================
  // EDITAR
  // ==========================================

  function startEditing(
    review: Review
  ) {

    setRating(
      review.rating
    );


    setComment(
      review.comment ?? ""
    );


    setEditing(
      true
    );


    setError("");

    setSuccess("");

  }


  // ==========================================
  // CREAR / ACTUALIZAR
  // ==========================================

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {

    event.preventDefault();


    setError("");
    setSuccess("");


    if (
      !isAuthenticated ||
      !token
    ) {

      setError(
        "Debes iniciar sesión para dejar una reseña."
      );

      return;

    }


    if (
      rating < 1 ||
      rating > 5
    ) {

      setError(
        "Selecciona entre 1 y 5 estrellas."
      );

      return;

    }


    try {

      setSubmitting(
        true
      );


      if (
        editing &&
        userReview
      ) {

        await updateReview(
          token,
          userReview.id,
          {
            rating,

            comment:
              comment.trim() ||
              null,
          }
        );


        setSuccess(
          "Tu reseña fue actualizada correctamente."
        );

      } else {

        await createReview(
          token,
          productId,
          {
            rating,

            comment:
              comment.trim() ||
              null,
          }
        );


        setSuccess(
          "Gracias por compartir tu opinión."
        );

      }


      await refreshReviews();


      resetForm();

    } catch (
      requestError
    ) {

      console.error(
        requestError
      );


      if (
        requestError
          instanceof Error
      ) {

        setError(
          requestError.message
        );

      } else {

        setError(
          "No se pudo guardar la reseña."
        );

      }

    } finally {

      setSubmitting(
        false
      );

    }

  }


  // ==========================================
  // ELIMINAR
  // ==========================================

  async function handleDelete(
    review: Review
  ) {

    if (!token) {
      return;
    }


    const confirmed =
      window.confirm(
        "¿Deseas eliminar tu reseña?"
      );


    if (!confirmed) {
      return;
    }


    try {

      setSubmitting(
        true
      );

      setError("");
      setSuccess("");


      await deleteReview(
        token,
        review.id
      );


      await refreshReviews();


      resetForm();


      setSuccess(
        "Tu reseña fue eliminada."
      );

    } catch (
      requestError
    ) {

      console.error(
        requestError
      );


      if (
        requestError
          instanceof Error
      ) {

        setError(
          requestError.message
        );

      } else {

        setError(
          "No se pudo eliminar la reseña."
        );

      }

    } finally {

      setSubmitting(
        false
      );

    }

  }


  // ==========================================
  // FECHA
  // ==========================================

  function formatDate(
    value: string
  ) {

    const date =
      new Date(
        value
      );


    if (
      Number.isNaN(
        date.getTime()
      )
    ) {

      return "";

    }


    return new Intl.DateTimeFormat(
      "es-PE",
      {
        day: "numeric",
        month: "long",
        year: "numeric",
      }
    ).format(
      date
    );

  }


  // ==========================================
  // ESTRELLAS PROMEDIO
  // ==========================================

  const roundedAverage =
    Math.round(
      summary.average_rating
    );


  const selectedRating =
    hoverRating ||
    rating;


  return (

    <section className="reviews-section">

      {/* =====================================
          CABECERA
      ===================================== */}

      <div className="reviews-heading">

        <div>

          <span className="reviews-label">
            OPINIONES
          </span>


          <h2>
            Lo que dicen de esta fragancia
          </h2>


          <p>
            Experiencias compartidas por
            clientes de AURA.
          </p>

        </div>


        <div className="reviews-summary">

          <strong>
            {summary.average_rating.toFixed(
              1
            )}
          </strong>


          <div>

            <div className="reviews-summary-stars">

              {STAR_VALUES.map(
                (star) => (

                  <Star
                    key={
                      star
                    }
                    size={17}
                    strokeWidth={1.3}
                    fill={
                      star <=
                      roundedAverage
                        ? "currentColor"
                        : "none"
                    }
                  />

                )
              )}

            </div>


            <span>

              {summary.total_reviews}

              {" "}

              {summary.total_reviews ===
              1
                ? "valoración"
                : "valoraciones"}

            </span>

          </div>

        </div>

      </div>


      {/* =====================================
          FORMULARIO
      ===================================== */}

      <div className="review-form-area">

        {!isAuthenticated ? (

          <div className="review-login">

            <span>
              TU OPINIÓN
            </span>


            <h3>
              ¿Ya probaste esta fragancia?
            </h3>


            <p>
              Inicia sesión para dejar tu
              valoración.
            </p>


            <Link to="/login">
              Iniciar sesión
            </Link>

          </div>

        ) : userReview &&
          !editing ? (

          <div className="review-already-created">

            <div>

              <span>
                TU OPINIÓN
              </span>


              <h3>
                Ya calificaste este perfume
              </h3>


              <p>
                Puedes modificar tu
                calificación o comentario.
              </p>

            </div>


            <button
              type="button"
              onClick={() =>
                startEditing(
                  userReview
                )
              }
            >

              <Pencil
                size={14}
              />

              Editar mi reseña

            </button>

          </div>

        ) : (

          <form
            className="review-form"
            onSubmit={
              handleSubmit
            }
          >

            <div className="review-form-heading">

              <span>
                TU OPINIÓN
              </span>


              <h3>

                {editing
                  ? "Editar reseña"
                  : "Califica esta fragancia"}

              </h3>

            </div>


            {/* ESTRELLAS */}

            <div className="review-rating-field">

              <span>
                Tu calificación
              </span>


              <div
                className="review-rating-selector"
                onMouseLeave={() =>
                  setHoverRating(
                    0
                  )
                }
              >

                {STAR_VALUES.map(
                  (star) => (

                    <button
                      key={
                        star
                      }
                      type="button"
                      className={
                        star <=
                        selectedRating
                          ? "review-star review-star-active"
                          : "review-star"
                      }
                      onMouseEnter={() =>
                        setHoverRating(
                          star
                        )
                      }
                      onClick={() =>
                        setRating(
                          star
                        )
                      }
                      aria-label={
                        `${star} estrellas`
                      }
                    >

                      <Star
                        size={28}
                        strokeWidth={1.2}
                        fill={
                          star <=
                          selectedRating
                            ? "currentColor"
                            : "none"
                        }
                      />

                    </button>

                  )
                )}

              </div>

            </div>


            {/* COMENTARIO */}

            <div className="review-comment-field">

              <label htmlFor="review-comment">

                Comentario{" "}

                <span>
                  (opcional)
                </span>

              </label>


              <textarea
                id="review-comment"
                rows={5}
                maxLength={1000}
                value={
                  comment
                }
                placeholder="Cuéntanos qué te pareció esta fragancia..."
                onChange={(
                  event
                ) =>
                  setComment(
                    event.target.value
                  )
                }
              />


              <small>
                {comment.length}/1000
              </small>

            </div>


            <div className="review-form-actions">

              {editing && (

                <button
                  type="button"
                  className="review-cancel-button"
                  onClick={
                    resetForm
                  }
                  disabled={
                    submitting
                  }
                >

                  Cancelar

                </button>

              )}


              <button
                type="submit"
                className="review-submit-button"
                disabled={
                  submitting ||
                  rating === 0
                }
              >

                {submitting
                  ? "Guardando..."
                  : editing
                    ? "Guardar cambios"
                    : "Publicar reseña"}

              </button>

            </div>

          </form>

        )}


        {error && (

          <div className="review-message review-message-error">

            {error}

          </div>

        )}


        {success && (

          <div className="review-message review-message-success">

            {success}

          </div>

        )}

      </div>


      {/* =====================================
          LISTADO
      ===================================== */}

      <div className="reviews-list-area">

        <div className="reviews-list-header">

          <span>
            RESEÑAS
          </span>


          <p>

            {summary.total_reviews}

            {" "}

            {summary.total_reviews ===
            1
              ? "opinión publicada"
              : "opiniones publicadas"}

          </p>

        </div>


        {loading ? (

          <div className="reviews-loading">

            Cargando opiniones...

          </div>

        ) : reviews.length ===
          0 ? (

          <div className="reviews-empty">

            <Star
              size={28}
            />


            <h3>
              Sé el primero en calificar
            </h3>


            <p>
              Este perfume todavía no tiene
              opiniones.
            </p>

          </div>

        ) : (

          <div className="reviews-list">

            {reviews.map(
              (review) => {

                const isOwnReview =
                  user?.id ===
                  review.user_id;


                return (

                  <article
                    key={
                      review.id
                    }
                    className={
                      isOwnReview
                        ? "review-card review-card-own"
                        : "review-card"
                    }
                  >

                    <div className="review-card-top">

                      <div>

                        <strong>
                          {review.author_name}
                        </strong>


                        <span>
                          {formatDate(
                            review.created_at
                          )}
                        </span>

                      </div>


                      {isOwnReview && (

                        <span className="review-own-label">

                          Tu reseña

                        </span>

                      )}

                    </div>


                    <div className="review-card-stars">

                      {STAR_VALUES.map(
                        (star) => (

                          <Star
                            key={
                              star
                            }
                            size={15}
                            strokeWidth={1.3}
                            fill={
                              star <=
                              review.rating
                                ? "currentColor"
                                : "none"
                            }
                          />

                        )
                      )}

                    </div>


                    {review.comment && (

                      <p className="review-card-comment">

                        {review.comment}

                      </p>

                    )}


                    {isOwnReview && (

                      <div className="review-card-actions">

                        <button
                          type="button"
                          disabled={
                            submitting
                          }
                          onClick={() =>
                            startEditing(
                              review
                            )
                          }
                        >

                          <Pencil
                            size={13}
                          />

                          Editar

                        </button>


                        <button
                          type="button"
                          disabled={
                            submitting
                          }
                          onClick={() =>
                            void handleDelete(
                              review
                            )
                          }
                        >

                          <Trash2
                            size={13}
                          />

                          Eliminar

                        </button>

                      </div>

                    )}

                  </article>

                );

              }
            )}

          </div>

        )}

      </div>

    </section>

  );

}


export default ProductReviews;
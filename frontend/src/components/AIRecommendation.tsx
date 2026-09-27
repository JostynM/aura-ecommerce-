import {
  ArrowRight,
  Bot,
  LoaderCircle,
  Send,
  Sparkles,
  UserRound,
} from "lucide-react";

import {
  useRef,
  useState,
} from "react";

import type {
  FormEvent,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import {
  sendRecommendationMessage,
} from "../services/recommendationService";

import type {
  ChatHistoryItem,
  RecommendedProduct,
} from "../services/recommendationService";

import {
  getProductImageUrl,
} from "../services/productService";

import "./AIRecommendation.css";


// ==========================================
// TIPO DE MENSAJE DEL CHAT
// ==========================================

interface ChatMessage {
  id: number;

  role:
    | "user"
    | "assistant";

  content: string;

  recommendations?: RecommendedProduct[];
}


// ==========================================
// MENSAJE INICIAL
// ==========================================

const INITIAL_MESSAGE: ChatMessage = {
  id: 1,

  role: "assistant",

  content:
    "Hola, soy AURA. Cuéntame qué tipo de perfume buscas y te ayudaré a encontrar opciones de nuestro catálogo.",
};


// ==========================================
// COMPONENTE
// ==========================================

function AIRecommendation() {
  const navigate =
    useNavigate();


  // ========================================
  // REFERENCIA DEL INPUT
  // ========================================

  const inputRef =
    useRef<HTMLInputElement | null>(
      null
    );


  // ========================================
  // CONTADOR DE MENSAJES
  // ========================================

  const messageIdRef =
    useRef(2);


  // ========================================
  // ESTADOS
  // ========================================

  const [
    chatOpen,
    setChatOpen,
  ] = useState(false);


  const [
    input,
    setInput,
  ] = useState("");


  const [
    messages,
    setMessages,
  ] = useState<ChatMessage[]>([
    INITIAL_MESSAGE,
  ]);


  const [
    loading,
    setLoading,
  ] = useState(false);


  const [
    error,
    setError,
  ] = useState<string | null>(
    null
  );


  // ========================================
  // GENERAR ID DE MENSAJE
  // ========================================

  const getNextMessageId = () => {
    const id =
      messageIdRef.current;

    messageIdRef.current += 1;

    return id;
  };


  // ========================================
  // ABRIR CHAT
  // ========================================

  const openChat = () => {
    setChatOpen(true);

    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };


  // ========================================
  // CONSTRUIR HISTORIAL
  // ========================================

  const buildHistory =
    (): ChatHistoryItem[] => {

      return messages.map(
        (message) => ({
          role:
            message.role,

          content:
            message.content,
        })
      );
    };


  // ========================================
  // ENVIAR MENSAJE
  // ========================================

  const sendMessage = async (
    customMessage?: string
  ) => {
    const messageText = (
      customMessage ??
      input
    ).trim();


    if (
      !messageText ||
      loading
    ) {
      return;
    }


    // El mensaje actual no se incluye
    // en history porque el backend
    // ya lo recibe en "message".
    const history =
      buildHistory();


    // ======================================
    // MENSAJE DEL USUARIO
    // ======================================

    const userMessage:
      ChatMessage = {

      id:
        getNextMessageId(),

      role:
        "user",

      content:
        messageText,
    };


    setMessages(
      (current) => [
        ...current,
        userMessage,
      ]
    );


    setInput("");

    setError(null);

    setLoading(true);


    try {
      // ====================================
      // ENVIAR A FASTAPI
      // ====================================

      const response =
        await sendRecommendationMessage({
          message:
            messageText,

          history,
        });


      // ====================================
      // RESPUESTA DE AURA
      // ====================================

      const assistantMessage:
        ChatMessage = {

        id:
          getNextMessageId(),

        role:
          "assistant",

        content:
          response.message,

        recommendations:
          response.recommendations,
      };


      setMessages(
        (current) => [
          ...current,
          assistantMessage,
        ]
      );

    } catch (requestError) {
      const errorMessage =
        requestError instanceof Error
          ? requestError.message
          : "Ocurrió un error inesperado.";


      setError(
        errorMessage
      );

    } finally {
      setLoading(false);
    }
  };


  // ========================================
  // ENVIAR FORMULARIO
  // ========================================

  const handleSubmit = (
    event:
      FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    void sendMessage();
  };


  // ========================================
  // IR AL PRODUCTO
  // ========================================

  const handleProductClick = (
    slug: string
  ) => {
    navigate(
      `/producto/${slug}`
    );
  };


  // ========================================
  // SUGERENCIAS RÁPIDAS
  // ========================================

  const quickPrompts = [
    "Busco algo para una cita",
    "Quiero un perfume para uso diario",
    "Algo dulce para salir de noche",
  ];


  // ========================================
  // VISTA
  // ========================================

  return (
    <section className="ai-section">

      <div className="ai-content">


        {/* =================================
            INFORMACIÓN PRINCIPAL
        ================================= */}

        <div className="ai-text">

          <span className="ai-label">
            PERFUME AI
          </span>


          <h2>
            Encuentra una fragancia
            hecha para ti.
          </h2>


          <p>
            Conversa con AURA como lo
            harías con un asesor.
            Cuéntale qué aromas te gustan,
            para qué ocasión buscas un
            perfume o cuánto quieres gastar.
          </p>


          {/* ===============================
              BOTÓN ABRIR CHAT
          =============================== */}

          {!chatOpen && (

            <button
              type="button"

              className="ai-button"

              onClick={
                openChat
              }
            >

              Encontrar mi perfume

              <ArrowRight
                size={17}
                strokeWidth={1.5}
              />

            </button>

          )}


          {/* ===============================
              ESTADO AURA
          =============================== */}

          {chatOpen && (

            <div className="ai-active-label">

              <span className="ai-active-dot" />

              AURA está lista para ayudarte

            </div>

          )}

        </div>


        {/* =================================
            VISUAL ORIGINAL
        ================================= */}

        {!chatOpen && (

          <div className="ai-visual">

            <div className="ai-orb">

              <Sparkles
                size={34}
                strokeWidth={1.3}
              />

            </div>


            <span>
              Recomendación personalizada
            </span>

          </div>

        )}


        {/* =================================
            CHAT
        ================================= */}

        {chatOpen && (

          <div className="ai-chat">


            {/* =============================
                HEADER
            ============================= */}

            <div className="ai-chat-header">

              <div className="ai-chat-avatar">

                <Sparkles
                  size={18}
                  strokeWidth={1.4}
                />

              </div>


              <div>

                <strong>
                  AURA
                </strong>

                <span>
                  Asesor de fragancias
                </span>

              </div>

            </div>


            {/* =============================
                MENSAJES
            ============================= */}

            <div className="ai-chat-messages">

              {messages.map(
                (message) => (

                  <div
                    key={
                      message.id
                    }

                    className={
                      `ai-message ai-message-${message.role}`
                    }
                  >

                    {/* =====================
                        MENSAJE
                    ===================== */}

                    <div className="ai-message-row">

                      <div className="ai-message-icon">

                        {message.role ===
                        "assistant" ? (

                          <Bot
                            size={16}
                            strokeWidth={1.5}
                          />

                        ) : (

                          <UserRound
                            size={16}
                            strokeWidth={1.5}
                          />

                        )}

                      </div>


                      <div className="ai-message-content">

                        <p>
                          {message.content}
                        </p>

                      </div>

                    </div>


                    {/* =====================
                        RECOMENDACIONES
                    ===================== */}

                    {message.recommendations &&
                      message.recommendations
                        .length > 0 && (

                      <div className="ai-products">

                        {message
                          .recommendations
                          .map(
                            (product) => (

                              <article
                                key={
                                  product.id
                                }

                                className="ai-product-card"
                              >


                                {/* =================
                                    IMAGEN
                                ================= */}

                                <div className="ai-product-image">

                                  {product.image_url ? (

                                    <img
                                      src={
                                        getProductImageUrl(
                                          product.image_url
                                        )
                                      }

                                      alt={
                                        `${product.brand} ${product.name}`
                                      }

                                      loading="lazy"
                                    />

                                  ) : (

                                    <div className="ai-product-placeholder">

                                      <Sparkles
                                        size={28}
                                        strokeWidth={1}
                                      />

                                    </div>

                                  )}

                                </div>


                                {/* =================
                                    INFORMACIÓN
                                ================= */}

                                <div className="ai-product-info">

                                  <span className="ai-product-brand">

                                    {product.brand}

                                  </span>


                                  <h3>

                                    {product.name}

                                  </h3>


                                  <strong className="ai-product-price">

                                    S/{" "}

                                    {Number(
                                      product.price
                                    ).toFixed(2)}

                                  </strong>


                                  <p className="ai-product-reason">

                                    {product.reason}

                                  </p>


                                  <button
                                    type="button"

                                    className="ai-product-button"

                                    onClick={() =>
                                      handleProductClick(
                                        product.slug
                                      )
                                    }
                                  >

                                    Ver perfume

                                    <ArrowRight
                                      size={14}
                                      strokeWidth={1.5}
                                    />

                                  </button>

                                </div>

                              </article>

                            )
                          )}

                      </div>

                    )}

                  </div>

                )
              )}


              {/* =============================
                  AURA ESTÁ ESCRIBIENDO
              ============================= */}

              {loading && (

                <div className="ai-message ai-message-assistant">

                  <div className="ai-message-row">

                    <div className="ai-message-icon">

                      <Bot
                        size={16}
                        strokeWidth={1.5}
                      />

                    </div>


                    <div className="ai-typing">

                      <LoaderCircle
                        size={18}

                        className="ai-loading-icon"
                      />


                      <span>
                        AURA está buscando...
                      </span>

                    </div>

                  </div>

                </div>

              )}


              {/* =============================
                  ERROR
              ============================= */}

              {error && (

                <div className="ai-chat-error">

                  {error}

                </div>

              )}

            </div>


            {/* =================================
                SUGERENCIAS RÁPIDAS
            ================================= */}

            {messages.length === 1 && (

              <div className="ai-quick-prompts">

                {quickPrompts.map(
                  (prompt) => (

                    <button
                      key={
                        prompt
                      }

                      type="button"

                      disabled={
                        loading
                      }

                      onClick={() =>
                        void sendMessage(
                          prompt
                        )
                      }
                    >

                      {prompt}

                    </button>

                  )
                )}

              </div>

            )}


            {/* =================================
                CAMPO DE MENSAJE
            ================================= */}

            <form
              className="ai-chat-form"

              onSubmit={
                handleSubmit
              }
            >

              <input
                ref={
                  inputRef
                }

                type="text"

                value={
                  input
                }

                disabled={
                  loading
                }

                maxLength={
                  2000
                }

                placeholder="Cuéntame qué perfume estás buscando..."

                onChange={(event) =>
                  setInput(
                    event.target.value
                  )
                }
              />


              <button
                type="submit"

                disabled={
                  loading ||
                  !input.trim()
                }

                aria-label="Enviar mensaje"
              >

                {loading ? (

                  <LoaderCircle
                    size={19}

                    className="ai-loading-icon"
                  />

                ) : (

                  <Send
                    size={19}
                    strokeWidth={1.5}
                  />

                )}

              </button>

            </form>

          </div>

        )}

      </div>

    </section>
  );
}


export default AIRecommendation;
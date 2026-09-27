import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";

import {
  Navigate,
  useNavigate,
  useParams,
} from "react-router-dom";

import {
  ArrowLeft,
  ImagePlus,
  X,
} from "lucide-react";

import { useAuth } from "../context/useAuth";

import {
  createProduct,
  getAdminProductById,
  getProductImageUrl,
  updateProduct,
  uploadProductImage,
  type ProductPayload,
} from "../services/productService";

import "./AdminProductForm.css";


const MAX_IMAGE_SIZE =
  5 * 1024 * 1024;


const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];


const emptyForm: ProductPayload = {
  slug: "",

  brand: "",

  name: "",

  description: "",

  price: 0,

  stock: 0,

  size_ml: 100,

  perfume_type: "disenador",

  gender: "unisex",

  image_url: null,

  top_notes: [],

  heart_notes: [],

  base_notes: [],

  is_active: true,
};


function AdminProductForm() {

  const navigate =
    useNavigate();


  const {
    productId,
  } = useParams();


  const {
    user,
    token,
    isAuthenticated,
    loading,
  } = useAuth();


  const isEditMode =
    productId !== undefined;


  const fileInputRef =
    useRef<HTMLInputElement | null>(
      null
    );


  const previewObjectUrlRef =
    useRef<string | null>(
      null
    );


  const [
    form,
    setForm,
  ] = useState<ProductPayload>({
    ...emptyForm,
  });


  const [
    topNotesText,
    setTopNotesText,
  ] = useState("");


  const [
    heartNotesText,
    setHeartNotesText,
  ] = useState("");


  const [
    baseNotesText,
    setBaseNotesText,
  ] = useState("");


  const [
    selectedImage,
    setSelectedImage,
  ] = useState<File | null>(
    null
  );


  const [
    currentImageUrl,
    setCurrentImageUrl,
  ] = useState("");


  const [
    imagePreview,
    setImagePreview,
  ] = useState("");


  const [
    error,
    setError,
  ] = useState("");


  const [
    saving,
    setSaving,
  ] = useState(false);


  const [
    productLoading,
    setProductLoading,
  ] = useState(false);


  // ========================================
  // LIBERAR URL TEMPORAL DE LA PREVISUALIZACIÓN
  // ========================================

  useEffect(() => {

    return () => {

      if (
        previewObjectUrlRef.current
      ) {

        URL.revokeObjectURL(
          previewObjectUrlRef.current
        );

      }

    };

  }, []);


  // ========================================
  // CARGAR PRODUCTO EN MODO EDICIÓN
  // ========================================

  useEffect(() => {

    async function loadProduct() {

      if (
        !isEditMode ||
        !productId ||
        !token
      ) {
        return;
      }


      const id =
        Number(productId);


      if (
        Number.isNaN(id)
      ) {

        setError(
          "ID de producto inválido."
        );

        return;
      }


      try {

        setProductLoading(
          true
        );

        setError("");


        const product =
          await getAdminProductById(
            token,
            id
          );


        setForm({

          slug:
            product.slug,

          brand:
            product.brand,

          name:
            product.name,

          description:
            product.description,

          price:
            Number(
              product.price
            ),

          stock:
            product.stock,

          size_ml:
            product.size_ml,

          perfume_type:
            product.perfume_type ===
            "arabe"
              ? "arabe"
              : "disenador",

          gender:
            product.gender ===
            "hombre"
              ? "hombre"
              : product.gender ===
                "mujer"
                ? "mujer"
                : "unisex",

          image_url:
            product.image_url,

          top_notes:
            product.top_notes,

          heart_notes:
            product.heart_notes,

          base_notes:
            product.base_notes,

          is_active:
            product.is_active,
        });


        setTopNotesText(
          product.top_notes.join(
            ", "
          )
        );


        setHeartNotesText(
          product.heart_notes.join(
            ", "
          )
        );


        setBaseNotesText(
          product.base_notes.join(
            ", "
          )
        );


        const resolvedImageUrl =
          getProductImageUrl(
            product.image_url
          );


        setCurrentImageUrl(
          resolvedImageUrl
        );


        setImagePreview(
          resolvedImageUrl
        );


      } catch (error) {

        if (
          error instanceof Error
        ) {

          setError(
            error.message
          );

        } else {

          setError(
            "No se pudo cargar el producto."
          );

        }

      } finally {

        setProductLoading(
          false
        );

      }

    }


    loadProduct();

  }, [
    isEditMode,
    productId,
    token,
  ]);


  // ========================================
  // CONVERTIR TEXTO A ARRAY DE NOTAS
  // ========================================

  const textToNotes = (
    text: string
  ): string[] => {

    return text
      .split(",")

      .map(
        (note) =>
          note.trim()
      )

      .filter(
        (note) =>
          note.length > 0
      );

  };


  // ========================================
  // SELECCIONAR IMAGEN
  // ========================================

  const handleImageChange = (
    event:
      ChangeEvent<HTMLInputElement>
  ) => {

    const file =
      event.target.files?.[0];


    if (!file) {
      return;
    }


    // ======================================
    // VALIDAR FORMATO
    // ======================================

    if (
      !ALLOWED_IMAGE_TYPES.includes(
        file.type
      )
    ) {

      setError(
        "Formato de imagen no permitido. Usa JPG, PNG o WEBP."
      );


      event.target.value = "";

      return;
    }


    // ======================================
    // VALIDAR TAMAÑO
    // ======================================

    if (
      file.size >
      MAX_IMAGE_SIZE
    ) {

      setError(
        "La imagen no puede superar los 5 MB."
      );


      event.target.value = "";

      return;
    }


    setError("");


    // Eliminamos una preview temporal
    // anterior si existía.
    if (
      previewObjectUrlRef.current
    ) {

      URL.revokeObjectURL(
        previewObjectUrlRef.current
      );

    }


    const previewUrl =
      URL.createObjectURL(
        file
      );


    previewObjectUrlRef.current =
      previewUrl;


    setSelectedImage(
      file
    );


    setImagePreview(
      previewUrl
    );

  };


  // ========================================
  // CANCELAR CAMBIO DE IMAGEN
  // ========================================

  const handleCancelImageChange =
    () => {

      if (
        previewObjectUrlRef.current
      ) {

        URL.revokeObjectURL(
          previewObjectUrlRef.current
        );

        previewObjectUrlRef.current =
          null;

      }


      setSelectedImage(
        null
      );


      // Si estamos editando,
      // regresamos a la fotografía original.
      setImagePreview(
        currentImageUrl
      );


      if (
        fileInputRef.current
      ) {

        fileInputRef.current.value =
          "";

      }

    };


  // ========================================
  // GUARDAR PRODUCTO
  // ========================================

  const handleSubmit = async (
    event:
      FormEvent<HTMLFormElement>
  ) => {

    event.preventDefault();


    if (!token) {
      return;
    }


    // ======================================
    // VALIDAR SLUG
    // ======================================

    if (
      !form.slug.trim()
    ) {

      setError(
        "El slug del producto es obligatorio."
      );

      return;
    }


    // ======================================
    // NUEVOS PRODUCTOS DEBEN TENER IMAGEN
    // ======================================

    if (
      !isEditMode &&
      !selectedImage &&
      !form.image_url
    ) {

      setError(
        "Selecciona una imagen para el producto."
      );

      return;
    }


    try {

      setSaving(
        true
      );

      setError("");


      // ====================================
      // CONSERVAR IMAGEN EXISTENTE
      // ====================================

      let finalImageUrl =
        form.image_url;


      // ====================================
      // SI HAY NUEVA IMAGEN, SUBIRLA
      // ====================================

      if (
        selectedImage
      ) {

        const uploadResult =
          await uploadProductImage(
            token,
            selectedImage,
            form.slug.trim()
          );


        finalImageUrl =
          uploadResult.image_url;

      }


      // ====================================
      // PREPARAR PRODUCTO
      // ====================================

      const productData:
        ProductPayload = {

        ...form,


        slug:
          form.slug.trim(),


        brand:
          form.brand.trim(),


        name:
          form.name.trim(),


        description:
          form.description.trim(),


        image_url:
          finalImageUrl,


        top_notes:
          textToNotes(
            topNotesText
          ),


        heart_notes:
          textToNotes(
            heartNotesText
          ),


        base_notes:
          textToNotes(
            baseNotesText
          ),
      };


      // ====================================
      // ACTUALIZAR PRODUCTO
      // ====================================

      if (
        isEditMode &&
        productId
      ) {

        const id =
          Number(
            productId
          );


        if (
          Number.isNaN(id)
        ) {

          throw new Error(
            "ID de producto inválido."
          );

        }


        await updateProduct(
          token,
          id,
          productData
        );

      }


      // ====================================
      // CREAR PRODUCTO
      // ====================================

      else {

        await createProduct(
          token,
          productData
        );

      }


      // ====================================
      // IR AL PANEL
      // ====================================

      navigate(
        "/admin"
      );


    } catch (error) {

      if (
        error instanceof Error
      ) {

        setError(
          error.message
        );

      } else {

        setError(
          "No se pudo guardar el producto."
        );

      }


    } finally {

      setSaving(
        false
      );

    }

  };


  // ========================================
  // CARGANDO AUTENTICACIÓN
  // ========================================

  if (loading) {

    return (

      <main className="admin-product-page">

        <p>
          Cargando...
        </p>

      </main>

    );

  }


  // ========================================
  // NO AUTENTICADO
  // ========================================

  if (
    !isAuthenticated ||
    !user
  ) {

    return (

      <Navigate
        to="/login"
        replace
      />

    );

  }


  // ========================================
  // NO ADMIN
  // ========================================

  if (
    user.role !==
    "admin"
  ) {

    return (

      <Navigate
        to="/"
        replace
      />

    );

  }


  // ========================================
  // CARGANDO PRODUCTO
  // ========================================

  if (
    productLoading
  ) {

    return (

      <main className="admin-product-page">

        <p>
          Cargando producto...
        </p>

      </main>

    );

  }


  // ========================================
  // INTERFAZ
  // ========================================

  return (

    <main className="admin-product-page">

      <section className="admin-product-form-container">


        <button
          type="button"
          className="admin-back-button"

          onClick={() =>
            navigate(
              "/admin"
            )
          }
        >

          <ArrowLeft
            size={16}
          />

          Volver al panel

        </button>


        <div className="admin-form-heading">

          <span>
            CATÁLOGO
          </span>


          <h1>

            {isEditMode
              ? "Editar producto"
              : "Agregar producto"}

          </h1>


          <p>

            {isEditMode
              ? "Modifica la información del perfume."
              : "Registra un nuevo perfume en el catálogo de AURA."}

          </p>

        </div>


        {error && (

          <p className="admin-form-error">

            {error}

          </p>

        )}


        <form
          className="admin-product-form"
          onSubmit={handleSubmit}
        >


          {/* ==================================
              NOMBRE
          ================================== */}

          <div className="admin-field">

            <label>
              Nombre
            </label>

            <input
              type="text"

              value={
                form.name
              }

              onChange={(event) =>
                setForm({
                  ...form,

                  name:
                    event.target.value,
                })
              }

              placeholder="Ej. Sauvage Eau de Parfum"

              required
            />

          </div>


          {/* ==================================
              MARCA
          ================================== */}

          <div className="admin-field">

            <label>
              Marca
            </label>

            <input
              type="text"

              value={
                form.brand
              }

              onChange={(event) =>
                setForm({
                  ...form,

                  brand:
                    event.target.value,
                })
              }

              placeholder="Ej. Dior"

              required
            />

          </div>


          {/* ==================================
              SLUG
          ================================== */}

          <div className="admin-field admin-field-full">

            <label>
              Slug
            </label>

            <input
              type="text"

              value={
                form.slug
              }

              onChange={(event) =>
                setForm({
                  ...form,

                  slug:
                    event.target.value,
                })
              }

              placeholder="dior-sauvage-edp"

              required
            />

            <small>
              Se utilizará en la URL del producto.
            </small>

          </div>


          {/* ==================================
              PRECIO
          ================================== */}

          <div className="admin-field">

            <label>
              Precio
            </label>

            <input
              type="number"

              min="0.01"

              step="0.01"

              value={
                form.price
              }

              onChange={(event) =>
                setForm({
                  ...form,

                  price:
                    Number(
                      event.target.value
                    ),
                })
              }

              required
            />

          </div>


          {/* ==================================
              STOCK
          ================================== */}

          <div className="admin-field">

            <label>
              Stock
            </label>

            <input
              type="number"

              min="0"

              step="1"

              value={
                form.stock
              }

              onChange={(event) =>
                setForm({
                  ...form,

                  stock:
                    Number(
                      event.target.value
                    ),
                })
              }

              required
            />

          </div>


          {/* ==================================
              TAMAÑO
          ================================== */}

          <div className="admin-field">

            <label>
              Tamaño (ml)
            </label>

            <input
              type="number"

              min="1"

              step="1"

              value={
                form.size_ml
              }

              onChange={(event) =>
                setForm({
                  ...form,

                  size_ml:
                    Number(
                      event.target.value
                    ),
                })
              }

              required
            />

          </div>


          {/* ==================================
              TIPO
          ================================== */}

          <div className="admin-field">

            <label>
              Tipo
            </label>

            <select
              value={
                form.perfume_type
              }

              onChange={(event) =>
                setForm({
                  ...form,

                  perfume_type:
                    event.target.value ===
                    "arabe"
                      ? "arabe"
                      : "disenador",
                })
              }
            >

              <option value="disenador">
                Diseñador
              </option>

              <option value="arabe">
                Árabe
              </option>

            </select>

          </div>


          {/* ==================================
              GÉNERO
          ================================== */}

          <div className="admin-field">

            <label>
              Género
            </label>

            <select
              value={
                form.gender
              }

              onChange={(event) =>
                setForm({
                  ...form,

                  gender:
                    event.target.value ===
                    "hombre"
                      ? "hombre"

                      : event.target.value ===
                        "mujer"
                        ? "mujer"

                        : "unisex",
                })
              }
            >

              <option value="hombre">
                Hombre
              </option>

              <option value="mujer">
                Mujer
              </option>

              <option value="unisex">
                Unisex
              </option>

            </select>

          </div>


          {/* ==================================
              DESCRIPCIÓN
          ================================== */}

          <div className="admin-field admin-field-full">

            <label>
              Descripción
            </label>

            <textarea
              value={
                form.description
              }

              onChange={(event) =>
                setForm({
                  ...form,

                  description:
                    event.target.value,
                })
              }

              placeholder="Describe la fragancia..."

              rows={5}

              required
            />

          </div>


          {/* ==================================
              IMAGEN DEL PRODUCTO
          ================================== */}

          <div className="admin-field admin-field-full">

            <label>
              Imagen del producto
            </label>


            <div className="admin-image-manager">


              <div className="admin-image-preview">

                {imagePreview ? (

                  <img
                    src={imagePreview}

                    alt={
                      form.name
                        ? `Vista previa de ${form.name}`
                        : "Vista previa del perfume"
                    }
                  />

                ) : (

                  <div className="admin-image-placeholder">

                    <ImagePlus
                      size={36}
                      strokeWidth={1.3}
                    />

                    <span>
                      Sin imagen
                    </span>

                  </div>

                )}


                {selectedImage && (

                  <span className="admin-image-new-badge">
                    NUEVA IMAGEN
                  </span>

                )}

              </div>


              <div className="admin-image-controls">

                <div>

                  <span className="admin-image-eyebrow">

                    {selectedImage
                      ? "IMAGEN SELECCIONADA"

                      : currentImageUrl
                        ? "IMAGEN ACTUAL"

                        : "IMAGEN DEL CATÁLOGO"}

                  </span>


                  <h3>

                    {selectedImage
                      ? selectedImage.name

                      : currentImageUrl
                        ? "Fotografía actual del producto"

                        : "Agrega una fotografía del perfume"}

                  </h3>


                  <p>

                    {selectedImage
                      ? "Esta fotografía reemplazará la imagen actual cuando guardes el producto."

                      : currentImageUrl
                        ? "Puedes conservar esta imagen o seleccionar una nueva."

                        : "Selecciona una fotografía clara del producto para mostrarla en la tienda."}

                  </p>

                </div>


                <input
                  ref={
                    fileInputRef
                  }

                  id="product-image"

                  className="admin-image-input"

                  type="file"

                  accept="
                    image/jpeg,
                    image/png,
                    image/webp
                  "

                  onChange={
                    handleImageChange
                  }
                />


                <label
                  htmlFor="product-image"
                  className="admin-image-select-button"
                >

                  <ImagePlus
                    size={17}
                  />


                  {imagePreview
                    ? "Cambiar imagen"
                    : "Seleccionar imagen"}

                </label>


                <small className="admin-image-help">

                  JPG, PNG o WEBP · Máximo 5 MB

                </small>


                {selectedImage && (

                  <div className="admin-selected-file">

                    <div>

                      <strong>
                        {selectedImage.name}
                      </strong>


                      <span>

                        {(
                          selectedImage.size /
                          1024 /
                          1024
                        ).toFixed(2)}

                        {" MB"}

                      </span>

                    </div>


                    <button
                      type="button"

                      aria-label="Cancelar cambio de imagen"

                      onClick={
                        handleCancelImageChange
                      }
                    >

                      <X
                        size={17}
                      />

                    </button>

                  </div>

                )}

              </div>

            </div>

          </div>


          {/* ==================================
              NOTAS DE SALIDA
          ================================== */}

          <div className="admin-field admin-field-full">

            <label>
              Notas de salida
            </label>

            <input
              type="text"

              value={
                topNotesText
              }

              onChange={(event) =>
                setTopNotesText(
                  event.target.value
                )
              }

              placeholder="Bergamota, Limón, Pimienta"
            />

            <small>
              Separa las notas con comas.
            </small>

          </div>


          {/* ==================================
              NOTAS DE CORAZÓN
          ================================== */}

          <div className="admin-field admin-field-full">

            <label>
              Notas de corazón
            </label>

            <input
              type="text"

              value={
                heartNotesText
              }

              onChange={(event) =>
                setHeartNotesText(
                  event.target.value
                )
              }

              placeholder="Lavanda, Geranio, Iris"
            />

            <small>
              Separa las notas con comas.
            </small>

          </div>


          {/* ==================================
              NOTAS DE FONDO
          ================================== */}

          <div className="admin-field admin-field-full">

            <label>
              Notas de fondo
            </label>

            <input
              type="text"

              value={
                baseNotesText
              }

              onChange={(event) =>
                setBaseNotesText(
                  event.target.value
                )
              }

              placeholder="Ámbar, Vainilla, Cedro"
            />

            <small>
              Separa las notas con comas.
            </small>

          </div>


          {/* ==================================
              ACTIVO
          ================================== */}

          <label className="admin-active-checkbox">

            <input
              type="checkbox"

              checked={
                form.is_active
              }

              onChange={(event) =>
                setForm({
                  ...form,

                  is_active:
                    event.target.checked,
                })
              }
            />

            <span>
              Producto activo
            </span>

          </label>


          {/* ==================================
              BOTONES
          ================================== */}

          <div className="admin-form-actions">

            <button
              type="button"

              className="admin-cancel-button"

              disabled={
                saving
              }

              onClick={() =>
                navigate(
                  "/admin"
                )
              }
            >

              Cancelar

            </button>


            <button
              type="submit"

              className="admin-save-button"

              disabled={
                saving
              }
            >

              {saving
                ? selectedImage
                  ? "Subiendo imagen..."
                  : "Guardando..."

                : isEditMode
                  ? "Actualizar producto"

                  : "Guardar producto"}

            </button>

          </div>


        </form>

      </section>

    </main>

  );

}


export default AdminProductForm;
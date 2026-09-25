import {
  useEffect,
  useState,
  type FormEvent,
} from "react";

import {
  Navigate,
  useNavigate,
  useParams,
} from "react-router-dom";

import { ArrowLeft } from "lucide-react";

import { useAuth } from "../context/useAuth";

import {
  createProduct,
  getAdminProductById,
  updateProduct,
  type ProductPayload,
} from "../services/productService";

import "./AdminProductForm.css";


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
  const navigate = useNavigate();

  const { productId } = useParams();


  const {
    user,
    token,
    isAuthenticated,
    loading,
  } = useAuth();


  const isEditMode =
    productId !== undefined;


  const [form, setForm] =
    useState<ProductPayload>({
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


  const [error, setError] =
    useState("");


  const [saving, setSaving] =
    useState(false);


  const [
    productLoading,
    setProductLoading,
  ] = useState(false);


  useEffect(() => {
    async function loadProduct() {
      if (
        !isEditMode ||
        !productId ||
        !token
      ) {
        return;
      }


      const id = Number(productId);


      if (Number.isNaN(id)) {
        setError(
          "ID de producto inválido."
        );

        return;
      }


      try {
        setProductLoading(true);
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
            Number(product.price),

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
            product.gender === "hombre"
              ? "hombre"
              : product.gender === "mujer"
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
          product.top_notes.join(", ")
        );


        setHeartNotesText(
          product.heart_notes.join(", ")
        );


        setBaseNotesText(
          product.base_notes.join(", ")
        );

      } catch (error) {
        if (error instanceof Error) {
          setError(
            error.message
          );
        } else {
          setError(
            "No se pudo cargar el producto."
          );
        }

      } finally {
        setProductLoading(false);
      }
    }


    loadProduct();

  }, [
    isEditMode,
    productId,
    token,
  ]);


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


  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();


    if (!token) {
      return;
    }


    try {
      setSaving(true);
      setError("");


      const productData: ProductPayload = {
        ...form,

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


      if (
        isEditMode &&
        productId
      ) {
        const id =
          Number(productId);


        if (Number.isNaN(id)) {
          throw new Error(
            "ID de producto inválido."
          );
        }


        await updateProduct(
          token,
          id,
          productData
        );

      } else {

        await createProduct(
          token,
          productData
        );

      }


      navigate("/admin");

    } catch (error) {
      if (error instanceof Error) {
        setError(
          error.message
        );
      } else {
        setError(
          "No se pudo guardar el producto."
        );
      }

    } finally {
      setSaving(false);
    }
  };


  if (loading) {
    return (
      <main className="admin-product-page">

        <p>
          Cargando...
        </p>

      </main>
    );
  }


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


  if (user.role !== "admin") {
    return (
      <Navigate
        to="/"
        replace
      />
    );
  }


  if (productLoading) {
    return (
      <main className="admin-product-page">

        <p>
          Cargando producto...
        </p>

      </main>
    );
  }


  return (
    <main className="admin-product-page">

      <section className="admin-product-form-container">

        <button
          type="button"
          className="admin-back-button"
          onClick={() =>
            navigate("/admin")
          }
        >
          <ArrowLeft size={16} />

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

          <div className="admin-field">

            <label>
              Nombre
            </label>

            <input
              type="text"
              value={form.name}
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


          <div className="admin-field">

            <label>
              Marca
            </label>

            <input
              type="text"
              value={form.brand}
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


          <div className="admin-field admin-field-full">

            <label>
              Slug
            </label>

            <input
              type="text"
              value={form.slug}
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
              Se utilizará en la URL
              del producto.
            </small>

          </div>


          <div className="admin-field">

            <label>
              Precio
            </label>

            <input
              type="number"
              min="0.01"
              step="0.01"
              value={form.price}
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


          <div className="admin-field">

            <label>
              Stock
            </label>

            <input
              type="number"
              min="0"
              step="1"
              value={form.stock}
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


          <div className="admin-field">

            <label>
              Tamaño (ml)
            </label>

            <input
              type="number"
              min="1"
              step="1"
              value={form.size_ml}
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


          <div className="admin-field">

            <label>
              Tipo
            </label>

            <select
              value={form.perfume_type}
              onChange={(event) =>
                setForm({
                  ...form,

                  perfume_type:
                    event.target.value === "arabe"
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


          <div className="admin-field">

            <label>
              Género
            </label>

            <select
              value={form.gender}
              onChange={(event) =>
                setForm({
                  ...form,

                  gender:
                    event.target.value === "hombre"
                      ? "hombre"
                      : event.target.value === "mujer"
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


          <div className="admin-field admin-field-full">

            <label>
              Descripción
            </label>

            <textarea
              value={form.description}
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


          <div className="admin-field admin-field-full">

            <label>
              URL de imagen
            </label>

            <input
              type="text"
              value={
                form.image_url ?? ""
              }
              onChange={(event) =>
                setForm({
                  ...form,

                  image_url:
                    event.target.value.trim()
                      ? event.target.value
                      : null,
                })
              }
              placeholder="https://..."
            />

          </div>


          <div className="admin-field admin-field-full">

            <label>
              Notas de salida
            </label>

            <input
              type="text"
              value={topNotesText}
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


          <div className="admin-field admin-field-full">

            <label>
              Notas de corazón
            </label>

            <input
              type="text"
              value={heartNotesText}
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


          <div className="admin-field admin-field-full">

            <label>
              Notas de fondo
            </label>

            <input
              type="text"
              value={baseNotesText}
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


          <label className="admin-active-checkbox">

            <input
              type="checkbox"
              checked={form.is_active}
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


          <div className="admin-form-actions">

            <button
              type="button"
              className="admin-cancel-button"
              onClick={() =>
                navigate("/admin")
              }
            >
              Cancelar
            </button>


            <button
              type="submit"
              className="admin-save-button"
              disabled={saving}
            >
              {saving
                ? "Guardando..."
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
import {
  useEffect,
  useState,
} from "react";

import CatalogFilters from "../components/CatalogFilters";
import ProductCard from "../components/ProductCard";

import { getProducts } from "../services/productService";
import type { Product } from "../types/Product";

import "./Catalog.css";


function Catalog() {
  const [products, setProducts] =
    useState<Product[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [selectedTypes, setSelectedTypes] =
    useState<string[]>([]);

  const [selectedGenders, setSelectedGenders] =
    useState<string[]>([]);

  const [selectedBrands, setSelectedBrands] =
    useState<string[]>([]);

  const [sortBy, setSortBy] =
    useState("popular");


  useEffect(() => {
    async function loadProducts() {
      try {
        setLoading(true);
        setError("");

        const data =
          await getProducts();

        setProducts(data);

      } catch (error) {
        if (error instanceof Error) {
          setError(error.message);
        } else {
          setError(
            "No se pudieron cargar los productos."
          );
        }
      } finally {
        setLoading(false);
      }
    }

    loadProducts();

  }, []);


  const toggleType = (
    type: string
  ) => {
    setSelectedTypes((current) =>
      current.includes(type)
        ? current.filter(
            (item) => item !== type
          )
        : [...current, type]
    );
  };


  const toggleGender = (
    gender: string
  ) => {
    setSelectedGenders((current) =>
      current.includes(gender)
        ? current.filter(
            (item) => item !== gender
          )
        : [...current, gender]
    );
  };


  const toggleBrand = (
    brand: string
  ) => {
    setSelectedBrands((current) =>
      current.includes(brand)
        ? current.filter(
            (item) => item !== brand
          )
        : [...current, brand]
    );
  };


  const clearFilters = () => {
    setSelectedTypes([]);
    setSelectedGenders([]);
    setSelectedBrands([]);
  };


  let filteredProducts =
    products.filter((product) => {

      const typeMatches =
        selectedTypes.length === 0 ||
        selectedTypes.includes(
          product.type
        );

      const genderMatches =
        selectedGenders.length === 0 ||
        selectedGenders.includes(
          product.gender
        );

      const brandMatches =
        selectedBrands.length === 0 ||
        selectedBrands.includes(
          product.brand
        );

      return (
        typeMatches &&
        genderMatches &&
        brandMatches
      );
    });


  filteredProducts =
    [...filteredProducts].sort(
      (a, b) => {

        if (sortBy === "price-low") {
          return a.price - b.price;
        }

        if (sortBy === "price-high") {
          return b.price - a.price;
        }

        if (sortBy === "rating") {
          return b.rating - a.rating;
        }

        return 0;
      }
    );


  return (
    <main className="catalog-page">

      <section className="catalog-hero">

        <span>
          DESCUBRE AURA
        </span>

        <h1>
          Perfumes
        </h1>

        <p>
          Encuentra una fragancia que
          represente tu esencia.
        </p>

      </section>


      <section className="catalog-container">

        <CatalogFilters
          selectedTypes={selectedTypes}
          selectedGenders={
            selectedGenders
          }
          selectedBrands={
            selectedBrands
          }
          onTypeChange={toggleType}
          onGenderChange={toggleGender}
          onBrandChange={toggleBrand}
          onClear={clearFilters}
        />


        <div className="catalog-products">

          <div className="catalog-toolbar">

            <span>
              {filteredProducts.length}
              {" "}
              productos
            </span>


            <select
              value={sortBy}
              onChange={(event) =>
                setSortBy(
                  event.target.value
                )
              }
            >

              <option value="popular">
                Más vendidos
              </option>

              <option value="price-low">
                Precio: menor a mayor
              </option>

              <option value="price-high">
                Precio: mayor a menor
              </option>

              <option value="rating">
                Mejor valorados
              </option>

            </select>

          </div>


          {loading && (
            <p className="catalog-message">
              Cargando perfumes...
            </p>
          )}


          {error && (
            <p className="catalog-error">
              {error}
            </p>
          )}


          {!loading && !error && (

            <div className="catalog-grid">

              {filteredProducts.length > 0 ? (

                filteredProducts.map(
                  (product) => (

                    <ProductCard
                      key={product.id}
                      slug={product.slug}
                      brand={product.brand}
                      name={product.name}
                      price={product.price}
                      rating={product.rating}
                      image={product.image}
                    />

                  )
                )

              ) : (

                <p className="catalog-message">
                  No encontramos perfumes
                  con esos filtros.
                </p>

              )}

            </div>

          )}

        </div>

      </section>

    </main>
  );
}


export default Catalog;
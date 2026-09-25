import "./CatalogFilters.css";

type CatalogFiltersProps = {
  selectedTypes: string[];
  selectedGenders: string[];
  selectedBrands: string[];

  onTypeChange: (type: string) => void;
  onGenderChange: (gender: string) => void;
  onBrandChange: (brand: string) => void;

  onClear: () => void;
};

function CatalogFilters({
  selectedTypes,
  selectedGenders,
  selectedBrands,
  onTypeChange,
  onGenderChange,
  onBrandChange,
  onClear,
}: CatalogFiltersProps) {

  return (
    <aside className="catalog-filters">

      <div className="filters-title">

        <h3>
          Filtros
        </h3>

        <button onClick={onClear}>
          Limpiar
        </button>

      </div>

      <div className="filter-group">

        <h4>
          Tipo
        </h4>

        <label>
          <input
            type="checkbox"
            checked={selectedTypes.includes("arabe")}
            onChange={() =>
              onTypeChange("arabe")
            }
          />

          Árabe
        </label>

        <label>
          <input
            type="checkbox"
            checked={selectedTypes.includes("disenador")}
            onChange={() =>
              onTypeChange("disenador")
            }
          />

          Diseñador
        </label>

      </div>

      <div className="filter-group">

        <h4>
          Género
        </h4>

        <label>
          <input
            type="checkbox"
            checked={selectedGenders.includes("hombre")}
            onChange={() =>
              onGenderChange("hombre")
            }
          />

          Hombre
        </label>

        <label>
          <input
            type="checkbox"
            checked={selectedGenders.includes("mujer")}
            onChange={() =>
              onGenderChange("mujer")
            }
          />

          Mujer
        </label>

        <label>
          <input
            type="checkbox"
            checked={selectedGenders.includes("unisex")}
            onChange={() =>
              onGenderChange("unisex")
            }
          />

          Unisex
        </label>

      </div>

      <div className="filter-group">

        <h4>
          Marca
        </h4>

        {[
          "Lattafa",
          "Dior",
          "Versace",
          "Afnan",
        ].map((brand) => (

          <label key={brand}>

            <input
              type="checkbox"
              checked={selectedBrands.includes(brand)}
              onChange={() =>
                onBrandChange(brand)
              }
            />

            {brand}

          </label>

        ))}

      </div>

    </aside>
  );
}

export default CatalogFilters;
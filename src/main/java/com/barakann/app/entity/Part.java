package com.barakann.app.entity;

import jakarta.persistence.*;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.LinkedHashSet;
import java.util.Objects;
import java.util.Set;

@Getter
@Entity
@Table(name = "parts")
public class Part {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // category_id に対応
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id", nullable = false)
    private Category category;

    // brand_id に対応
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "brand_id", nullable = false)
    private Brand brand;

    // このパーツを選択したときに選択不可となるカテゴリー
    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
            name = "part_blocked_categories",
            joinColumns = @JoinColumn(name = "part_id"),
            inverseJoinColumns = @JoinColumn(name = "category_id")
    )
    @OrderBy("id ASC")
    private Set<Category> blockedCategories = new LinkedHashSet<>();

    // 製品に同梱される付属品・構成品
    @OneToMany(mappedBy = "part", fetch = FetchType.LAZY, cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("id ASC")
    private Set<PartIncludedItem> includedItems = new LinkedHashSet<>();

    @Column(nullable = false, length = 150)
    private String name;

    // サイズや色などを除いた製品モデル名
    @Column(name = "model_name", length = 150)
    private String modelName;

    // サイズ・色・歯数など、購入可能なバリエーション名
    @Column(name = "variant_name", length = 150)
    private String variantName;

    @Column(nullable = false)
    private Integer price;

    // 商品情報の更新日時とは分けて、価格を確認・変更した日時を保持する
    @Column(name = "price_updated_at")
    private LocalDateTime priceUpdatedAt;

    @Column(nullable = false)
    private Integer weight;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public Part() {
    }

    public Part(Category category, Brand brand, String name, Integer price, Integer weight, String description) {
        this.category = category;
        this.brand = brand;
        this.name = name;
        this.price = price;
        this.weight = weight;
        this.description = description;
    }

    public void setCategory(Category category) {
        this.category = category;
    }

    public void setBrand(Brand brand) {
        this.brand = brand;
    }

    public void setName(String name) {
        this.name = name;
    }

    public void setModelName(String modelName) {
        this.modelName = modelName;
    }

    public void setVariantName(String variantName) {
        this.variantName = variantName;
    }

    public void setPrice(Integer price) {
        if (!Objects.equals(this.price, price)) {
            this.priceUpdatedAt = LocalDateTime.now();
        }

        this.price = price;
    }

    public void setPriceUpdatedAt(LocalDateTime priceUpdatedAt) {
        this.priceUpdatedAt = priceUpdatedAt;
    }

    public void setWeight(Integer weight) {
        this.weight = weight;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    @PrePersist
    public void prePersist() {
        LocalDateTime now = LocalDateTime.now();
        this.createdAt = now;
        this.updatedAt = now;

        if (this.modelName == null || this.modelName.isBlank()) {
            this.modelName = this.name;
        }

        if (this.priceUpdatedAt == null) {
            this.priceUpdatedAt = now;
        }
    }

    @PreUpdate
    public void preUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}

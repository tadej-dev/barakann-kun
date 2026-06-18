package com.example.app.dto;

import com.example.app.entity.Part;

public class PartDto {

    private Long id;
    private String name;
    private Integer weight;
    private Integer price;

    public PartDto() {
    }

    public PartDto(Long id, String name, Integer weight, Integer price) {
        this.id = id;
        this.name = name;
        this.weight = weight;
        this.price = price;
    }

    public static PartDto from(Part part) {
        return new PartDto(
                part.getId(),
                part.getName(),
                part.getWeight(),
                part.getPrice()
        );
    }

    public Long getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public Integer getWeight() {
        return weight;
    }

    public Integer getPrice() {
        return price;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public void setName(String name) {
        this.name = name;
    }

    public void setWeight(Integer weight) {
        this.weight = weight;
    }

    public void setPrice(Integer price) {
        this.price = price;
    }
}